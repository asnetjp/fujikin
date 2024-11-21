
(function() {
	'use strict';
	
    
    
	/*---------------------------------------------------------------
	 functions
	---------------------------------------------------------------*/
	
	//GET國定假日
	async function GET_holiday(select_year){
		let url = "https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/" + select_year + ".json"
		return $.getJSON(url, function(data) {
			console.log("get holiday json file")
		}).then((data) =>{
			let holiday = [] //初始化
			for (let i = 0; i < data.length; i++) {
				if (data[i]["isHoliday"] == true) { //包含六日
					if (data[i]['description'] != '') { //過濾六日
						//data[i]
						holiday.push(data[i])
					}
				}
			}
			return holiday
			
		}).catch((data) =>{
			Swal.fire({
				icon: 'error',
				title: '尚無'+select_year+'年度資料!',
				text: '尚無'+select_year+'年度資料!'
			  })
		})
	}
	/*---------------------------------------------------------------
	 kintone Event
	---------------------------------------------------------------*/

    kintone.events.on("app.record.index.show", function(event) {
		if (document.getElementById("options-id") !== null) {
			return;
		}
		
		let this_appid = kintone.app.getId();
		let this_url = "/k/v1/records"
		
		const Kuc = Kucs['1.6.0'];
		const menuButton = new Kuc.Button({
			text: '年度國定假日取得',
			type: 'submit',
			className: 'options-class',
			id: 'options-id',
			visible: true,
			disabled: false
		});
		
		let now = new Date();
		let int_year = now.getFullYear();
		let year = int_year.toString()
		let next_year = (int_year+1).toString()
		//element setting ------------------------------------------------------

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
			id: 'options-id',
			visible: true,
			disabled: false
		});
		
		//-----------------------------------------------------------------------
		menuButton.onclick = function() {
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', {
				app: this_appid,
			}).then(function(resp) {
				
				var select_year = document.getElementById("options-id").value
				
				//檢查GET紀錄
				GET_holiday(select_year)
					.then((data) => {
						var this_year = new Date().getFullYear()
                        if(select_year==this_year){
                            var query = '假日日期=THIS_YEAR()'
                        }else{
                            var query = '假日日期=NEXT_YEAR() '
                        }
						
						var GET_body = {
							'app': this_appid,
							'query': query
						}
						kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp){
							var records = resp.records
							console.log(records)
							var records_date_list = []
							for (var j = 0; j < records.length; j++) {
								var records_date = records[j]["假日日期"].value
								var d = moment(records_date).format('YYYY-MM-DD')
								records_date_list.push(d)
							}
							var update_holiday_list = []//API body
							for (var i = 0; i < data.length; i++) {
								
								var moment_holiday_date = moment(data[i]['date']).format('YYYY-MM-DD')
								if(records_date_list.includes(moment_holiday_date)){
									//
								}else{
									var record = {
										"假日日期": {
											"value": moment_holiday_date
										},
										"星期": {
											"value": data[i]['week']
										},
										"假日名稱": {
											"value": data[i]['description']
										},
										"假日類型": {
											"value": "國定假日"
										}
									}
									update_holiday_list.push(record)
								}
							}
							var body = {
								"app": this_appid,
								"records": ''
							}
							body['records'] = update_holiday_list
							kintone.api(kintone.api.url('/k/v1/records'), 'POST', body).then(function(resp){
								console.log(resp)
								Swal.fire({
									icon: 'success',
									title: '假日更新完成!',
									showConfirmButton: false,
									timer: 3000
								  }).then(
									location.reload()
								  )
							})
						})
						
						
					})
				
				
			}).catch(function(error) {
				Swal.fire({
					icon: 'error',
					title: error+"失敗，請聯絡系統管理員",
					showConfirmButton: false,
					timer: 1500
				})
			});
			return event;
		};
		kintone.app.getHeaderMenuSpaceElement().appendChild(dropdown);
		kintone.app.getHeaderMenuSpaceElement().appendChild(menuButton);
	});
	
})()