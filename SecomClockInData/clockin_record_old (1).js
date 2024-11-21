(function()  {
	'use strict';
	moment.locale('zh-tw');
	/*---------------------------------------------------------------
	<功能簡介>
		主要功能->在 {SECOM打卡資料APP}創建按鈕事件onclick
	<onclick處理流程>
		1.GET {LOG APP}中上次打卡紀錄日期
		2.GET {SECOM打卡資料APP} 打卡紀錄日期以後的所有紀錄
		3.紀錄整合(包含格式,計算工時...)
		4.async_check_labor() function中,GET{員工年度紀錄APP},檢查是否有員工在職但有未打卡
		5.async_check_month_report() function中,GET{考勤表APP},檢查該員工該月份(某月21號-隔月20號)的考勤表是否存在
		6.將本次新增紀錄 POST {打卡紀錄整合APP}
		7.將本次新增紀錄 PUT {考勤表APP}
	---------------------------------------------------------------*/

	/*---------------------------------------------------------------
	 parameter
	---------------------------------------------------------------*/
	var eventsShow = ['app.record.index.show'];
	var log_appid = 364 //148 LOG
	var clockin_appid = 363 //142 SECOM打卡資料
	var correct_clockin_appid = 362 //146 打卡紀錄整合
	var month_report_appid = 367 //144 考勤表
	var year_labor_report_appid = 366 //156 員工年度紀錄
	var holiday_appid = 370 //188 假日設定
	/*---------------------------------------------------------------
	 function
	---------------------------------------------------------------*/

	/*
	* get all records function by using offset sample program
	* Copyright (c) 2019 Cybozu
	*
	* Licensed under the MIT License
	*/
	
	/*
	* @param {Object} _params
	*   - app {String}: 应用ID（省略时表示当前打开的应用）
	*   - filterCond {String}: 筛选条件
	*   - sortConds {Array}: 排序条件的数组
	*   - fields {Array}: 要获取的字段的数组
	*   - limit {Number}: 要获取的记录的条数（省略时获取符合筛选条件的所有记录）
	* @return {Object} response
	*   - records {Array}: 要获取的记录的数组
	*/
	var getRecords = function(_params) {
		var MAX_READ_LIMIT = 500;
	
		var params = _params || {};
		var app = params.app || kintone.app.getId();
		var filterCond = params.filterCond;
		var sortConds = params.sortConds;
		var limit = params.limit || -1;
		var offset = params.offset || 0;
		var fields = params.fields;
		var data = params.data;
	
		if (!data) {
		data = {
			records: []
		};
		}
	
		var willBeDone = false;
		var thisLimit = MAX_READ_LIMIT;
		// 调用getRecords函数的那方指定了记录的获取条数时
		//  willBeDone指定为true时，可在获取完指定的条数后退出。
		if (limit > 0) {
		if (thisLimit > limit) {
			thisLimit = limit;
			willBeDone = true;
		}
		}
	
		var conditions = [];
		if (filterCond) {
		conditions.push(filterCond);
		}
	
	var sortCondsAndLimit = (sortConds && sortConds.length > 0 ? ' order by ' + sortConds.join(', ') : '')
		+ ' limit ' + thisLimit;
		var query = conditions.join(' and ') + sortCondsAndLimit + ' offset ' + offset;
		var body = {
		app: app,
		query: query
		};
		if (fields && fields.length > 0) {
		body.fields = fields;
		}
		return kintone.api(kintone.api.url('/k/v1/records', true), 'GET', body).then(function(resp) {
			data.records = data.records.concat(resp.records);
			var _offset = resp.records.length;
			if (limit > 0 && limit < _offset) {
			willBeDone = true;
			}
			// 获取完该要获取的记录后退出
			if (_offset < thisLimit || willBeDone) {
			return data;
			}
			// 如果该获取的记录还未获取完，再调用函数获取剩余记录
			return getRecords({
			app: app,
			filterCond: filterCond,
			sortConds: sortConds,
			limit: limit - _offset,
			offset: offset + _offset,
			fields: fields,
			data: data
			});
		});
	};
	// GET holiday json
	function GET_holiday(year){
		let url = "https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/" + year + ".json"
		return $.getJSON(url, function(data) {
			console.log("get holiday json file")
		}).then((data) =>{
			let holiday = [] //初始化
			for (let i = 0; i < data.length; i++) {
				if (data[i]["isHoliday"] == true) { //包含六日
					data[i]["date"] = moment(data[i]['date']).format('YYYY-MM-DD')
					holiday.push(data[i])
				}
			}
			return holiday
		})
	}
	// 檢查假日
	function check_holiday(update_year,update_date){
		return new Promise((resolve, reject) => {
			if(update_year.length==1){
				var select_year = update_year[0]
				GET_holiday(select_year).then((holiday) =>{
					var work_date = []//應該工作日
					var holiday_date = []//應該放假日
					for(var j=0;j<holiday.length;j++){
						var taiwan_holiday = holiday[j]["date"]
						holiday_date.push(taiwan_holiday)
					}
					for(var i=0;i<update_date.length;i++){
						var check_date = update_date[i]
						if(holiday_date.includes(check_date)){
							//
						}else{
							work_date.push(check_date)
						}
					}
					console.log(work_date)
					async_GET_fujikin(work_date).then(function(res){
						console.log(res)	
						resolve(res)
					})
				
					
				}).catch((data) =>{
					Swal.fire({
						icon: 'error',
						title: '尚無'+select_year+'年度資料!',
						text: '尚無'+select_year+'年度資料!'
					})
				})
			}
		})
		
	}
	//GET 富士金假日
	function async_GET_fujikin(work_date){
        return new Promise((resolve, reject) => {
            var query = '假日日期 = THIS_YEAR()'
			var GET_body = {
				'app': holiday_appid,
				'query': query
			};
			
            kintone.api(kintone.api.url('/k/v1/records', true), 'GET', GET_body, function(resp) {
				//console.log(resp)
				var records = resp.records
				var true_work_date = []
				var fujikin_holiday = []
				for(var j=0;j<records.length;j++){
					var fujikin_holiday_date = records[j]["假日日期"].value
					fujikin_holiday.push(fujikin_holiday_date)
				}
				for(var i=0;i<work_date.length;i++){
					var check_d = work_date[i]
					if(fujikin_holiday.includes(check_d)){
						//
					}else{
						true_work_date.push(check_d)
					}
				}
				resolve(true_work_date)  //回傳 ['2023-01-02','2023-01-03']
            }, function(error) {
                // error
                console.log(error);
                reject(error)
            });
        })
    }
	//GET 員工年度紀錄 找出未打卡員工
	function async_check_labor(records_list, update_year, update_date){
		//
		return new Promise((resolve, reject) => {
            
			var query = '年度=\"' + update_year[0] + '\"'//GET今年 員工年度紀錄
			
            var GET_body = {
                'app': year_labor_report_appid,
                'query': query
            };
            kintone.api(kintone.api.url('/k/v1/records', true), 'GET', GET_body, function(resp) {
                // success
                //console.log(resp);
				var check_ans = []
				for(var j=0;j<resp.records.length;j++){
					var check_name = resp.records[j]['姓名'].value //社內員工名單 LOOP
					var check_date_list = []
					for(var i=0;i<records_list.length;i++){
						if(check_name.indexOf(records_list[i]['姓名'].value)!=-1){
							//找的到->確認日期
							var find_date = records_list[i]['打卡日期'].value
							check_date_list.push(find_date)
						}
					}
					if(check_date_list==update_date){
						//
					}else{//比較update_date和check_date_list->找出未打卡日期
						var result = update_date.filter((e)=>{
							return check_date_list.indexOf(e) === -1
						})
						
						if(result.length>0){
							result.forEach(function(item){
								var ans = {
									"name":check_name,
									"date":item
								}
								check_ans.push(ans)
							})
						}
							
							
						
					}
				}
                resolve(check_ans)
            }, function(error) {
                // error
                console.log(error);
                reject(error)
            });
        })
	}
	//POST 打卡一覽表
	function async_POST_correct_clockin(records){
		return new Promise((resolve, reject) => {
            //console.log(records)
            var POST_body = {
                'app': correct_clockin_appid,
                'records': records
            };
            kintone.api(kintone.api.url('/k/v1/records', true), 'POST', POST_body, function(resp) {
                // success
                //console.log(resp);
				
                resolve(records)
            }, function(error) {
                // error
                console.log(error);
                reject(error)
            });
        })
	}
	//PUT 考勤表
	function async_PUT_month_report(update_records, update_date, update_month, update_year){
		//
		return new Promise((resolve, reject) => {
            
            if(update_year.length>1){
				var query = '(年度=\"' + update_year[0] + '\" and 月份=12) or (年度=\"' + update_year[1] + '\" and 月份=1)'
			}else{
				if(update_month.length>1){
					var query = '年度=\"' + update_year[0] + '\" and (月份=\"' + update_month[0] + '\" or 月份=\"' + update_month[1] +'\")'
				}else{
					var query = '年度=\"' + update_year[0] + '\" and 月份=\"' + update_month[0] + '\"'
				}
			}
            var GET_body = {
                'app': month_report_appid,
                'query': query
            }
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp){
				//取得符合月份的紀錄
				var PUT_array = []
				
				for(var i=0;i<resp.records.length;i++){//考勤表紀錄
					var month_report_year = resp.records[i]['年度'].value
					var month_report_month = resp.records[i]['月份'].value
					var month_report_labor = resp.records[i]['姓名'].value
					var month_report_table = resp.records[i]['出缺勤紀錄'].value
					var month_report_record_id = resp.records[i]['記錄號碼'].value
					
					for(var j=0;j<update_records.length;j++){//PUT 紀錄
						var records_name = update_records[j]['姓名'].value
						var records_date = update_records[j]['打卡日期'].value
						var records_start_work = update_records[j]['上班時間'].value
						var records_end_work = update_records[j]['下班時間'].value
						var records_work_time = update_records[j]['工時'].value
						var records_real_work_time = update_records[j]['實際工時'].value
						var records_description = update_records[j]['備註'].value
						
						var last_month_last_day = new Date(month_report_year, month_report_month-1, 0).getDate()
						var last_month_last_day_QQ = Number(last_month_last_day)
						var date = new Date(records_date).getDate()
						var date_QQ = Number(date)
						
						if(update_month.length>1){
							if(date_QQ>20){
								var check_month = update_month[0]
							}else{
								var check_month = update_month[1]
							}
						}else{
							var check_month = update_month[0]
						}
						
						if(month_report_labor.indexOf(records_name)!=-1 && check_month==month_report_month){//名字+月份正確
							if(date_QQ>20){
								var k = date_QQ-21
							}else{
								var k = last_month_last_day_QQ-21+date_QQ
							}
							//檢查是否有先請假->check_description.indexOf("下午")!=-1
							var check_description = month_report_table[k].value["備註"].value
							
							var str_code = month_report_table[k].value["備註code"].value
							//
							var json = JSON.parse(month_report_table[k].value["備註code"].value)
							if(json["休暇"]!="" || json["補打卡"]!=""){
								console.log("請假/補打卡"+check_description)
								
								//確認是否有 補打卡 或請假--------------------------------------------
								
								if(json["休暇"]!=""){  //有請假
									month_report_table[k] = {
										"value":{
											"日期":{
												"value":month_report_table[k].value["日期"].value
											},
											"星期":{
												"value":month_report_table[k].value["星期"].value
											},
											"上班時間":{
												"value":records_start_work
											},
											"下班時間":{
												"value":records_end_work
											},
											"工時":{
												"value":records_work_time
											},
											"實際工時":{
												"value":records_real_work_time
											},
											"備註":{
												"value":check_description
											},
											"備註code":{
												"value":str_code
											}
										}
									}
								}else if(json["補打卡"]!=""){ //有補打卡
									month_report_table[k] = {
										"value":{
											"日期":{
												"value":month_report_table[k].value["日期"].value
											},
											"星期":{
												"value":month_report_table[k].value["星期"].value
											},
											"上班時間":{
												"value":month_report_table[k].value["上班時間"].value
											},
											"下班時間":{
												"value":month_report_table[k].value["下班時間"].value
											},
											"工時":{
												"value":month_report_table[k].value["工時"].value
											},
											"實際工時":{
												"value":month_report_table[k].value["實際工時"].value
											},
											"備註":{
												"value":check_description
											},
											"備註code":{
												"value":str_code
											}
										}
									}
								}
								//-------------------------------------------------------------------
								
							}else{
								//更新表格紀錄
									
									var str_description = records_description + check_description
									month_report_table[k] = {
										"value":{
											"日期":{
												"value":month_report_table[k].value["日期"].value
											},
											"星期":{
												"value":month_report_table[k].value["星期"].value
											},
											"上班時間":{
												"value":records_start_work
											},
											"下班時間":{
												"value":records_end_work
											},
											"工時":{
												"value":records_work_time
											},
											"實際工時":{
												"value":records_real_work_time
											},
											"備註":{
												"value":str_description
											},
											"備註code":{
												"value":str_code
											}
										}
									}
								
							}
							
						}
					}
					
					var record = {
						"id":month_report_record_id,
						"record":{
							"出缺勤紀錄":{
								"value":month_report_table
							}
						}
					}
					PUT_array.push(record)
					
				}
						
						
				
				//PUT 格式
				var PUT_body = {
					'app':month_report_appid,
					'records':PUT_array
				}
				//resolve(PUT_body)
				kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', PUT_body, function(resp) {
					resolve(true)
					//console.log("setTimeout...3秒")
					//setTimeout(resolve(true),3000)
				}, function(error) {
					// error
					console.log(error);
					reject(error)
				})
			})
        })
	}
	
	//PUT LOG
	function async_PUT_LOG(records_slice, update_date){
		return new Promise((resolve, reject) => {
			if(update_date.length>0){
				//日期降序->最後的日期更新至LOG
				update_date.sort(function(a,b){
					return new Date(b) - new Date(a)
				})
				var LOG_date = update_date[0]
				//API PUT
				var body = {
					"app":log_appid,
					"id":1,
					"record":{
						"上次打卡紀錄日期":{
							"value":LOG_date  //正式LOG_date
						},
						"打卡紀錄":{
							"value":JSON.stringify(records_slice)
						}
					}
				}
				
				kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body, function(resp) {
					// success
					console.log(resp);
					resolve(resp)
					Swal.fire({
						icon: 'success',
						title: '打卡資料更新完畢',
						showConfirmButton: false,
						timer: 3000
					})
				}, function(error) {
					// error
					console.log(error);
				});
			}else{
				reject("error")
			}
		})
		
	}
	

    /*---------------------------------------------------------------
	 event
	---------------------------------------------------------------*/
	kintone.events.on(eventsShow, function(event){
        
        var record = event.record

        if (document.getElementById("menuButton") !== null) {
			return;
		}
        //create button
		var menuButton = document.createElement("button");
		menuButton.id = "menuButton";
		menuButton.innerHTML = "更新打卡資料";
		menuButton.setAttribute("class", "gaia-ui-actionmenu-save");
		menuButton.onclick = function() {
			//GET LOG資料
			kintone.api(kintone.api.url('/k/v1/record'), 'GET', {
				app: log_appid,
				id:1
			}).then(function(resp) {
				//var labors = resp.record['打卡員工'].value
				var last_clockin_date = resp.record['上次打卡紀錄日期'].value
				console.log("上次打卡紀錄日期:" + last_clockin_date)
				//GET 本次SECOM打卡紀錄更新部分
				var params = {
					app: clockin_appid,
					filterCond: '刷卡日期>\"' + last_clockin_date + '\" and 姓名 not like \"臨時卡\"',
				  };
				getRecords(params).then(function(data) {
					//console.log(data)
					var update_date = []
					var update_month = []
					var this_year = new Date().getFullYear();
					var update_year = []
					data.records.forEach(element => {
						var date = element['刷卡日期'].value
						var D_date = new Date(date)
						if(update_date.includes(date)){
							//
						}else{
							if(D_date.getDate()>20){
								var D_month = D_date.getMonth()+2//超過20號為隔月,12月若隔月為1月做判斷
								if(D_month>12){
									var D_month = 1
									var D_year = D_date.getFullYear()+1
									update_year.push(D_year)
								}else{
									update_year.push(this_year)
								}
								if(update_month.includes(D_month)){
									//
								}else{
									update_month.push(D_month)
								}
								
								console.log("本次更新..."+D_month+'月')
							}else{
								var D_month = D_date.getMonth()+1
								if(D_month>12){
									var D_month = 1
									var D_year = D_date.getFullYear()+1
									update_year.push(D_year)
								}else{
									update_year.push(this_year)
								}
								if(update_month.includes(D_month)){
									//
								}else{
									update_month.push(D_month)
								}
								console.log("本次更新..."+D_month+'月')
							}
							update_date.push(date)
						}
					});
					console.log(update_date)
					console.log(update_month)
					console.log(update_year)
					//統整紀錄----------------------------------------
					var array = data.records
					var records_list = []
					for(var i=0;i<array.length;i++){
						var name =  array[i]['姓名'].value
						var date =  array[i]['刷卡日期'].value
						var labor_id =  array[i]['員編'].value
						var department = array[i]['部門'].value
						var description = array[i]['狀態_'].value
						var clockin_time = array[i]['刷卡時間'].value

						var record = {
							"姓名":{
								"value":name
							},
							"打卡日期":{
								"value":date
							},
							"員工編號":{
								"value":labor_id
							},
							"部門":{
								"value":department
							},
							"上班時間":{
								"value":''
							},
							"下班時間":{
								"value":''
							},
							"工時":{
								"value":''
							},
							"實際工時":{
								"value":''
							},
							"備註":{
								"value":''
							},
						}
						//根據單筆紀錄 ,檢查上下班 ()
						if(description.indexOf('上班')!=-1){
							
							record['上班時間'].value = clockin_time
						}else{
							
							record['下班時間'].value = clockin_time
						}
						var pushFlag = true
						//檢查是否該員工當天已有被新增打卡上班或下班進list
						for(var j=0;j<records_list.length;j++){
							if(records_list[j]['姓名'].value.indexOf(name)!=-1 && records_list[j]['打卡日期'].value==date){
								/*if(records_list[j]['上班時間'].value==''){
									records_list[j]['上班時間'].value = clockin_time
								}else{
									//比較時間大小
									var str_time = moment(records_list[j]['上班時間'].value, 'h:mm')
									var end_time = moment(clockin_time.value, 'h:mm')
									if(end_time.isBefore(str_time)){  //if true 時間前後錯誤
										records_list[j]['下班時間'].value = records_list[j]['上班時間'].value
										records_list[j]['上班時間'].value = clockin_time
									}else{
										records_list[j]['下班時間'].value = clockin_time
										records_list[j]['上班時間'].value = records_list[j]['上班時間'].value
									}
								}*/
								if(description.indexOf('上班')!=-1){
							
									records_list[j]['上班時間'].value = clockin_time
								}else{
									
									records_list[j]['下班時間'].value = clockin_time
								}
								pushFlag = false
								//計算工時
								var start_time = new Date("2022-01-01T" + records_list[j]['上班時間'].value)
								var end_time = new Date("2022-01-01T" + records_list[j]['下班時間'].value)
								var hours = Math.abs(end_time - start_time) / 36e5 //36e5 is the scientific notation for 60*60*1000
								var lunch_break = 0.75
								if((hours-lunch_break)>=8){
									records_list[j]['工時'].value = 8
									records_list[j]['實際工時'].value = hours-lunch_break
								}else if((hours-lunch_break)>=4 && (hours-lunch_break)<8){
									records_list[j]['工時'].value = 4
									records_list[j]['備註'].value = "打卡時數低於規定"
									records_list[j]['實際工時'].value = hours-lunch_break
								}else if(parseInt(hours)==4){
									records_list[j]['工時'].value = 4
									records_list[j]['備註'].value = "打卡時數低於規定"
									records_list[j]['實際工時'].value = hours
								}else{
									records_list[j]['備註'].value = "打卡時數低於規定"
									records_list[j]['工時'].value = hours
									records_list[j]['實際工時'].value = hours
								}
								
								
								break
							}
						}
						if(pushFlag){
							records_list.push(record)
						}
					}
					//打卡紀錄整合後
					//console.log(records_list)
					check_holiday(update_year,update_date).then(
						work_date => {
							//確認是否有未打卡員工 <員工年度紀錄>
							async_check_labor(records_list, update_year, update_date).then(
								response_check_labor => {
									if(response_check_labor.length>0){
										var no_clockin_list = []
										
										//把未打卡的員工加入更新紀錄中
										for(var i=0;i<response_check_labor.length;i++){
											var no_clockin_date = response_check_labor[i]["date"]
											if(work_date.includes(no_clockin_date)){
												var no_clockin = {
													"姓名":{
														"value":response_check_labor[i]["name"]
													},
													"打卡日期":{
														"value":no_clockin_date
													},
													"員工編號":{
														"value":''
													},
													"部門":{
														"value":''
													},
													"上班時間":{
														"value":''
													},
													"下班時間":{
														"value":''
													},
													"工時":{
														"value":0
													},
													"實際工時":{
														"value":0
													},
													"備註":{
														"value":'未打卡'
													},
												}
												records_list.push(no_clockin)
												no_clockin_list.push(response_check_labor[i]["name"]+response_check_labor[i]["date"]+"未打卡")
											}
										}
									}
									console.log(no_clockin_list)
									//新增確認是否上下班都有打卡
									for(var j=0;j<records_list.length;j++){
										var startTime = records_list[j]["上班時間"].value
										var endTime = records_list[j]["下班時間"].value
										if(startTime=="" || endTime==""){
											
											records_list[j]["備註"].value = "未打卡"
										}
									}
									console.log(records_list)
									
									//將records_list POST至打卡記錄整合
									var records_len = records_list.length
									var records_100 = parseInt(records_len/100)+1
												
									var range = [...Array(records_100).keys()]//展開成0到多個 key
												
												
									if (range.length > 1){
										var getLIST = ()=> {
											return new Promise((resolve, reject) => {
												var ls = []
												for(var k=0;k<range.length;k++){
													var start = k*100
													var end = (k+1)*100
													
													let records_slice = records_list.slice(start,end)
													ls.push(records_slice)
												}
												return setTimeout(
												() => resolve(ls),
												600
												)
											})
										}
													
													
										const doNextPromise = (d) => {
											var delays = []
											for(var k=0;k<range.length;k++){
												var start = k*100
												var end = (k+1)*100
												console.log(start+"-"+end)
												var records_slice = records_list.slice(start,end)
												delays.push(records_slice)
											}
											
											async_PUT_month_report(delays[d],update_date, update_month, update_year)
											.then(x => {
												console.log(`Waited: ${x / 1000} seconds\n`);
												d++;
												if (d < range.length){
													doNextPromise(d)
												}
												/*if (d < range.length)
												doNextPromise(d)
												else
												console.log(x);*/
											})
										}
										doNextPromise(0);
										const runAsyncFunctions = async () => {
											const ls = await getLIST()
													
											Promise.all(
												ls.map(async (records_slice) => {
													await async_POST_correct_clockin(records_slice)
																
													await async_PUT_LOG(records_slice, update_date)
												})
											)
										}
													
										runAsyncFunctions()
									}else{
													//POST 打卡一覽表
													async_POST_correct_clockin(records_list).then(
														resp => {
															//PUT 考勤表
															async_PUT_month_report(records_list, update_date, update_month, update_year).then(
																re=>{
																	//PUT LOG
																	if(update_date.length>0){
																		//降序
																		update_date.sort(function(a,b){
																			return new Date(b) - new Date(a)
																		})
																		var LOG_date = update_date[0]
																		//API PUT
																		var body = {
																			"app":log_appid,
																			"id":1,
																			"record":{
																				"上次打卡紀錄日期":{
																					"value":LOG_date
																				},
																				"打卡紀錄":{
																					"value":JSON.stringify(records_list)
																				}
																			}
																		}
																		kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body, function(resp) {
																			// success
																			console.log(resp);
																			Swal.fire({
																				icon: 'success',
																				title: '打卡資料更新完畢',
																				showConfirmButton: false,
																				timer: 3000
																			}).then(
																				location.reload()
																			)
																		}, function(error) {
																			// error
																			console.log(error);
																		});
																	}else{
																		Swal.fire({
																			icon: 'error',
																			title: '找不到可以更新的紀錄!',
																			text: '如有新增紀錄,但無法更新!請聯絡管理員!!'
																		})
																	}
																}
															)
														}
													)
												}
									
								}
							)
						}
					)
					
				})
				
			}).catch(function(error) {
				console.log(error)
			});
			return event;
		};
		kintone.app.getHeaderMenuSpaceElement().appendChild(menuButton);

    })
})()

