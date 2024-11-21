(function()  {

    /*---------------------------------------------------------------
	<功能簡介>
		主要功能->加班報表 表格自動生成
	
	---------------------------------------------------------------*/
	'use strict';
	
    /*---------------------------------------------------------------
	 parameter
	---------------------------------------------------------------*/
	var eventsShow = ['app.record.index.show','app.record.create.submit.success'];
    var eventsCreate = ['app.record.create.submit','app.record.detail.show'];
	var log_appid = 364 //148 LOG
	var clockin_appid = 363 //142 SECOM打卡資料
    var over_work_appid = kintone.app.getId()
	/*---------------------------------------------------------------
	 function
	---------------------------------------------------------------*/
	function async_GET(over_work_appid, labor_name, record_month, record_year){
        return new Promise((resolve, reject) => {
            
            var GET_body = {
                'app': over_work_appid,
                'query': '姓名=\"' + labor_name + '\"'
              };
            kintone.api(kintone.api.url('/k/v1/records', true), 'GET', GET_body, function(resp) {
                // success
                console.log(resp);
                var Flag = false;
                resp.records.every(function(item){
                    var month = item['月份'].value
                    var year = item['年度'].value
                    if(month==record_month && year==record_year){
                        Flag = false
                        return false
                    }else{
                        Flag = true
                        return true
                    }
                })
                resolve(Flag)
            }, function(error) {
                // error
                console.log(error);
                reject(error)
            });
        })
    }
    //PUT 加班報表 表格
	function async_update_table(select_year, select_month){
		//
		return new Promise((resolve, reject) => {
            
            var query = '年度=\"' + select_year + '\" and 月份=\"' + select_month + '\"'
			
            var GET_body = {
                'app': kintone.app.getId(),
                'query': query
            };
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp){
				var record = resp.records
                var PUT_records = []
                for(var i=0;i<record.length;i++){
                    
                    var record_month_id = record[i]['記錄號碼'].value
                    var record_month = record[i]['月份'].value
                    var record_year = record[i]['年度'].value
                    var record_table = record[i]['加班紀錄'].value

                    if(record_table.length>10){
                        console.log("已有表格")
                    }else{
                        
                        var table = []
                        
                        //生成 update_date
                        if(record_month==1){
                            var start_m = 12
                            var start_yr = record_year-1
                        }else{
                            var start_m = record_month-1
                            var start_yr = record_year
                        }
                        
                        var currentDate = moment(start_yr+"-"+start_m+"-"+21);
                        var stopDate = moment(record_year+"-"+record_month+"-"+20);
                        
                        while (currentDate <= stopDate) {
                            var row_date = moment(currentDate).format('YYYY-MM-DD')
                            var day_list = ['日', '一', '二', '三', '四', '五', '六'];
                            var date = new Date(row_date)
                            var day = date.getDay()
                            var get_day = day_list[day]
                            var row = {
                                "value":{
                                    "日期":{
                                        "value":row_date
                                    },
                                    "星期":{
                                        "value":get_day
                                    },
                                }
                            }
                            table.push(row)
                            currentDate = moment(currentDate).add(1, 'days');
                        }
                        console.log(table)
                        var per_record = {
                            'id':record_month_id,
                            'record': {
                                "加班紀錄":{
                                    "value":table
                                }
                            }
                        };
                        PUT_records.push(per_record)
                    }
                }
                var body = {
                    app:over_work_appid,
                    records:PUT_records
                }
                kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', body, function(resp) {
                    // success
                    console.log(resp);
                    if(resp.records.length==0){
                        resolve(resp)
                        Swal.fire({
                            icon: 'error',
                            title: '選項錯誤!請重新選擇!',
                            text: "error"
                          })
                    }else{
                        resolve(resp)
                        Swal.fire({
                            icon: 'success',
                            title: '表格已建立',
                            showConfirmButton: false,
                            timer: 1500
                        }).then(
                            location.reload()
                        )
                    }
                    
                }, function(error) {
                    // error
                    console.log(error);
                    Swal.fire({
                        icon: 'error',
                        title: '選項錯誤!請重新選擇!',
                        text: error.message
                      })
                    reject(error)
                });
				
				
			}).catch((err) => {
                Swal.fire({
                    icon: 'error',
                    title: '選項錯誤!請重新選擇!',
                    text: err
                  })
            })
        })
	}
    
    /*---------------------------------------------------------------
	 event
	---------------------------------------------------------------*/
	//創建後 限制修改日期,星期
    kintone.events.on('app.record.edit.show', function(event){
        var record = event.record
        
        var record_table = record['加班紀錄'].value
        if(record_table.length>10){
            console.log("已有表格")
            var user = kintone.getLoginUser();
            console.log(user);
            if(user["name"]=="Administrator" && user["code"]=="Administrator"){
                //可編輯
            }else{
                record['姓名'].disabled = true
                record['年度'].disabled = true
                record['月份'].disabled = true
                record['部門'].disabled = true
                record['code'].disabled = true
                record['員工編號'].disabled = true
                for(var i=0;i<record_table.length;i++){
                    record_table[i].value["日期"].disabled = true
                    record_table[i].value["日期格式"].disabled = true
                    record_table[i].value["星期"].disabled = true
                }
            }
        }

        return event
    })
    kintone.events.on('app.record.detail.show', function(event){//kintone上選擇複製 會複製表格->需再調整自動生成判斷
        var record = event.record
        var record_table = record['加班紀錄'].value
        var user = kintone.getLoginUser();
        console.log(user);
        if(user["name"]=="Administrator" && user["code"]=="Administrator"){
            //不隱藏欄位
        }else{
            //隱藏欄位
            kintone.app.record.setFieldShown('code', false);
            kintone.app.record.setFieldShown('KEY_系統用_', false);
            kintone.app.record.setFieldShown('日期_系統用_', false);
            kintone.app.record.setFieldShown('記錄號碼', false);
            kintone.app.record.setFieldShown('日期格式', false);
            kintone.app.record.setFieldShown('_', false);
        }
        
        
        //----------------------------------------------------------
        if(record_table.length>10){
            console.log("已有表格")
        }else{
            Swal.fire({
                icon: 'error',
                title: '請至應用程式頁面新增表格!',
                timer:1500
              })
        }
    })
    
    //更新表格 按鈕
    kintone.events.on('app.record.index.show', function(event){
        
        var record = event.record

        if (document.getElementById("options-id") !== null) {
			return;
		}
        //create button
		
        //element setting ------------------------------------------------------
        const Kuc = Kucs['1.6.0'];
		const menuButton = new Kuc.Button({
			text: '更新選擇表格',
			type: 'submit',
			className: 'options-class',
			id: 'options-id',
			visible: true,
			disabled: false
		});
        //create dropdown
        let now = new Date();
		let int_year = now.getFullYear();
		let year = int_year.toString()
		let next_year = (int_year+1).toString()
		
		const dropdown = new Kuc.Dropdown({
			//label: 'Fruit',
			requiredIcon: true,
			items: [
				{
					label:year,
					value:year
				},
				{
					label:next_year,
					value:next_year
				}
			],
			value: year,
			selectedIndex: 0,
			//error: 'Error occurred!',
			className: 'options-class',
			id: 'options-year',
			visible: true,
			disabled: false
		});
        const month_dropdown = new Kuc.Dropdown({
			requiredIcon: true,
			items: [
				{
					label:"一月",
					value:"1"
				},
				{
					label:"二月",
					value:"2"
				},
				{
					label:"三月",
					value:"3"
				},
				{
					label:"四月",
					value:"4"
				},
				{
					label:"五月",
					value:"5"
				},
				{
					label:"六月",
					value:"6"
				},
				{
					label:"七月",
					value:"7"
				},
				{
					label:"八月",
					value:"8"
				},
				{
					label:"九月",
					value:"9"
				},
				{
					label:"十月",
					value:"10"
				},
				{
					label:"十一月",
					value:"11"
				},
                {
					label:"十二月",
					value:"12"
				}
			],
			value: "1",
			selectedIndex: 0,
			//error: 'Error occurred!',
			className: 'options-class',
			id: 'options-month',
			visible: true,
			disabled: false
		});
		menuButton.onclick = function() {
            var select_year = document.getElementById("options-year").value
            var select_month = document.getElementById("options-month").value
            
            async_update_table(select_year, select_month).then(
                response => {
                    console.log(response)
                }
            )
        }
        kintone.app.getHeaderMenuSpaceElement().appendChild(dropdown);
        kintone.app.getHeaderMenuSpaceElement().appendChild(month_dropdown);
        kintone.app.getHeaderMenuSpaceElement().appendChild(menuButton);
        
    })
})()


