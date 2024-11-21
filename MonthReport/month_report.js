(function() {
	/*---------------------------------------------------------------
	<功能簡介>
		主要功能->考勤表 
	
	---------------------------------------------------------------*/
	'use strict';
	/*---------------------------------------------------------------
	 parameter
	---------------------------------------------------------------*/
	var holiday_appid = 370 //188 假日設定
  var month_report_appid = 367 //144 考勤表
	/*---------------------------------------------------------------
	 function
	---------------------------------------------------------------*/
	//GET 補班日
	async function GET_work_weekend(select_year, select_month) {
		let url = "https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/" + select_year + ".json"
		return $.getJSON(url, function(data) {
			console.log("get holiday json file")
		}).then((data) => {
			let work_weekend = [] //初始化
			for (let i = 0; i < data.length; i++) {
				if (data[i]['description'] == "補行上班") {
					var d = moment(data[i]["date"], 'YYYY-MM-DD')
					var month = d.format('M')
					//var date = moment(data[i]["date"], 'YYYY-MM-DD')
					if (month == select_month) {
						var date = moment(data[i]["date"]).format('YYYY-MM-DD')
						work_weekend.push(date)
					}
				}
			}
			console.log(work_weekend)
			return work_weekend
		}).catch((data) => {
			Swal.fire({
				icon: 'error',
				title: '尚無' + select_year + '年度資料!',
				text: '尚無' + select_year + '年度資料!'
			})
		})
	}
	//PUT 臨時假日
	function async_update_current_holiday(select_year, select_month) {
		return new Promise((resolve, reject) => {
			//query 生成
			if (select_year == moment().year()) {
				var query = '假日日期=THIS_YEAR()'
			} else {
				var query = '假日日期=NEXT_YEAR()'
			}
			var GET_body = {
				'app': holiday_appid,
				'query': query
			};
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp) {
				console.log(resp)
				var recrods = resp.records
				var current_holiday_list = []
				for (var j = 0; j < recrods.length; j++) { // 紀錄
					var current_holiday_date = recrods[j]['假日日期'].value
					var current_holiday_name = recrods[j]['假日名稱'].value
					var date = moment(current_holiday_date, 'YYYY-MM-DD') //假日日期
					var month = date.format('M');
					var day = date.format('D');
					if (month == 12 && day > 20) {
						//選擇更新明年1月
					} else if ((Number(select_month) == Number(month) && day < 21) || ((Number(select_month) - 1) == Number(month) && day > 20)) {
						console.log("更新:" + current_holiday_name + current_holiday_date)
						current_holiday_list.push({
							"假日日期": current_holiday_date,
							"假日名稱": current_holiday_name
						})
					} else {
						//
						console.log("無符合假日,不須更新")
					}
				}
				if (month == 12 && day > 20) {
					//選擇更新明年1月
					var month_report_year = Number(select_year) + 1
					var month_report_month = 1
				} else if ((Number(select_month) == Number(month) && day < 21) || ((Number(select_month) - 1) == Number(month) && day > 20)) {
					var month_report_year = select_year
					var month_report_month = select_month
				} else {
					var month_report_year = select_year
					var month_report_month = select_month
				}
				// success
				var query = '年度=\"' + month_report_year + '\" and 月份=\"' + month_report_month + '\"'
				console.log(query)
				var GET_body = {
					'app': month_report_appid,
					'query': query
				};
				var PUT_array = []
				kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(re) {
					console.log(re)
					for (var i = 0; i < re.records.length; i++) { //考勤表紀錄
						var month_report_table = re.records[i]['出缺勤紀錄'].value
						var month_report_record_id = re.records[i]['記錄號碼'].value
						var last_month_last_day = new Date(month_report_year, month_report_month - 1, 0).getDate()
						var last_month_last_day_QQ = Number(last_month_last_day)
						for (var j = 0; j < current_holiday_list.length; j++) {
							var date = moment(current_holiday_list[j]["假日日期"], 'YYYY-MM-DD')
							var day = date.format('D');
							if (day > 20) {
								var k = Number(day) - 21
							} else {
								var k = last_month_last_day_QQ - 21 + Number(day)
							}
							var json_description = {
								"休暇": current_holiday_list[j]["假日名稱"],
								"補打卡": ""
							}
							var str_json = JSON.stringify(json_description)
							month_report_table[k] = {
								"value": {
									"日期": {
										"value": current_holiday_list[j]["假日日期"]
									},
									"應上班": {
										"value": ""
									},
									"應下班": {
										"value": ""
									},
									"星期": {
										"value": month_report_table[k].value["星期"].value
									},
									"備註": {
										"value": current_holiday_list[j]["假日名稱"]
									},
									"備註code": {
										"value": str_json
									}
								}
							}
						}
						var record = {
							"id": month_report_record_id,
							"record": {
								"出缺勤紀錄": {
									"value": month_report_table
								}
							}
						}
						PUT_array.push(record)
					}
					//PUT 格式---------
					var PUT_body = {
						'app': month_report_appid,
						'records': PUT_array
					}
					resolve(PUT_body)
					kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', PUT_body, function(resp) {
						Swal.fire({
							icon: 'success',
							title: '表格已更新',
							showConfirmButton: false,
							timer: 1500
						}).then(location.reload())
						resolve(true)
					}, function(error) {
						// error
						Swal.fire({
							icon: 'error',
							title: '更新錯誤!',
							text: error.message
						})
						reject(error)
					})
				})
			}, function(error) {
				// error
				console.log(error);
			});
		})
	}
	//GET 假日
	function async_GET_holiday(select_year) {
		return new Promise((resolve, reject) => {
			if (select_year == moment().year()) {
				var query = '假日日期=THIS_YEAR()'
			} else {
				var query = '假日日期=NEXT_YEAR()'
			}
			var GET_body = {
				'app': holiday_appid,
				'query': query
			};
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp) {
				// success
				console.log(resp)
				var holiday_list = {}
				var len = resp.records.length
				for (var i = 0; i < len; i++) {
					holiday_list[resp.records[i]["假日日期"].value] = resp.records[i]["假日名稱"].value
				}
				resolve(holiday_list)
			}, function(error) {
				// error
				console.log(error);
				reject(error)
			});
		})
	}
	//GET 自己
	function async_GET(report_month_appid, labor_name, record_month, record_year) {
		return new Promise((resolve, reject) => {
			//query 生成
			var query = '年度=\"' + record_year + '\" and 月份=\"' + record_month + '\" and 姓名=\"' + labor_name + '\"'
			var GET_body = {
				'app': report_month_appid,
				'query': query
			};
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp) {
				// success
				//console.log(resp);
				if (resp.records.length == 0) {
					console.log(0)
					resolve(true)
				} else {
					var Flag = false;
					resp.records.every(function(item) {
						var month = item['月份'].value
						var year = item['年度'].value
						if (month == record_month && year == record_year) {
							Flag = false
							return false
						} else {
							Flag = true
							return true
						}
					})
					resolve(Flag)
				}
			}, function(error) {
				// error
				console.log(error);
				reject(error)
			});
		})
	}
	//PUT 考勤表 表格
	function async_update_table(select_year, select_month, holiday_list) {
		//
		return new Promise((resolve, reject) => {
			var query = '年度=\"' + select_year + '\" and 月份=\"' + select_month + '\"'
			var GET_body = {
				'app': kintone.app.getId(),
				'query': query
			};
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp) {
				var record = resp.records
				var PUT_records = []
				//獲取補班
				GET_work_weekend(select_year, select_month).then(function(result) {
					console.log(result)
					for (var i = 0; i < record.length; i++) {
						var report_month_appid = kintone.app.getId()
						var record_month_id = record[i]['記錄號碼'].value
						var record_month = record[i]['月份'].value
						var record_year = record[i]['年度'].value
						var record_name = record[i]['姓名'].value
						var record_table = record[i]['出缺勤紀錄'].value
						if (record_table.length > 10) {
							console.log("已有表格")
						} else {
							var table = []
							//生成 update_date
							if (record_month == 1) {
								var start_m = 12
								var start_yr = record_year - 1
							} else {
								var start_m = record_month - 1
								var start_yr = record_year
							}
							var currentDate = moment(start_yr + "-" + start_m + "-" + 21);
							var stopDate = moment(record_year + "-" + record_month + "-" + 20);
							var keys = Object.keys(holiday_list) //假日APP中包含的日期
							while (currentDate <= stopDate) {
								var row_date = moment(currentDate).format('YYYY-MM-DD')
								var day_list = ['日', '一', '二', '三', '四', '五', '六'];
								var date = new Date(row_date)
								var day = date.getDay()
								var get_day = day_list[day]
								//判斷是否 假日
								if (keys.includes(row_date)) {
									var json_description = {
										"休暇": holiday_list[row_date],
										"補打卡": "",
										"遲到": "",
										"早退": ""
									}
									var str_json = JSON.stringify(json_description)
									var row = {
										"value": {
											"日期": {
												"value": row_date
											},
											"星期": {
												"value": get_day
											},
											"應上班": {
												"value": ""
											},
											"應下班": {
												"value": ""
											},
											"備註": {
												"value": holiday_list[row_date]
											},
											"備註code": {
												"value": str_json
											}
										}
									}
								} else {
									var json_description = {
										"休暇": "",
										"補打卡": ""
									}
									var str_json = JSON.stringify(json_description)
									if (get_day == "六" || get_day == "日") {
										if (result.includes(row_date)) {
											var should_work = "08:45"
											var shoud_leave = "17:30"
											var des = ""
										} else {
											var should_work = ""
											var shoud_leave = ""
											var des = ""
										}
									} else {
										var should_work = "08:45"
										var shoud_leave = "17:30"
										var des = ""
									}
									var row = {
										"value": {
											"日期": {
												"value": row_date
											},
											"星期": {
												"value": get_day
											},
											"應上班": {
												"value": should_work
											},
											"應下班": {
												"value": shoud_leave
											},
											"備註": {
												"value": des
											},
											"備註code": {
												"value": str_json
											}
										}
									}
								}
								table.push(row)
								currentDate = moment(currentDate).add(1, 'days');
							}
							//console.log(table)
							var per_record = {
								'id': record_month_id,
								'record': {
									"紀錄使用者": {
										"value": [{
											"code": record_name
										}]
									},
									"出缺勤紀錄": {
										"value": table
									}
								}
							};
							PUT_records.push(per_record)
						}
					}
					var body = {
						app: report_month_appid,
						records: PUT_records
					}
					kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', body, function(resp) {
						// success
						console.log(resp);
						resolve(resp)
						Swal.fire({
							icon: 'success',
							title: '表格已建立',
							showConfirmButton: false,
							timer: 1500
						}).then(location.reload())
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
				})
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
	kintone.events.on('app.record.edit.show', function(event) {
		var record = event.record
		var record_table = record['出缺勤紀錄'].value
		if (record_table.length > 10) {
			console.log("已有表格")
			var user = kintone.getLoginUser();
			console.log(user);
			if (user["name"] == "Administrator" && user["code"] == "Administrator") {
				//可編輯
			} else {
				record['姓名'].disabled = true
				record['年度'].disabled = true
				record['月份'].disabled = true
				record['部門'].disabled = true
				record['code'].disabled = true
				record['員工編號'].disabled = true
				record['KEY_系統用_'].disabled = true
				record['日期_系統用_'].disabled = true
				for (var i = 0; i < record_table.length; i++) {
					record_table[i].value["日期"].disabled = true
					record_table[i].value["星期"].disabled = true
					record_table[i].value["備註code"].disabled = true
				}
			}
		}
		return event
	})
	kintone.events.on('app.record.detail.show', function(event) {
		var record = event.record
		var record_table = record['出缺勤紀錄'].value
		var leave = ['有給休暇','結婚休暇','忌引休暇','出産休暇','生理休暇','母体休養休暇','出産付添休暇',
									'出産検査休暇','公暇_公欠']
		var countObject = {};
		leave.forEach(function(leaveType) {
				countObject[leaveType] = 0;
				record_table.forEach(function(record) {
						var 備註 = record.value.備註.value;
						if (備註.includes(leaveType)) {
								countObject[leaveType]++;
						}
				});
		});
		console.log(countObject);
		var user = kintone.getLoginUser();
		//console.log(user);
		if (user["name"] == "Administrator" && user["code"] == "Administrator") {
			//不隱藏欄位
		} else {
			//隱藏欄位
			kintone.app.record.setFieldShown('code', false);
			kintone.app.record.setFieldShown('KEY_系統用_', false);
			kintone.app.record.setFieldShown('日期_系統用_', false);
			kintone.app.record.setFieldShown('記錄號碼', false);
			//kintone.app.record.setFieldShown('日期星期', false);
			kintone.app.record.setFieldShown('備註code', false);
			kintone.app.record.setFieldShown('實際工時', false);
		}
		if (record_table.length > 10) {
			//console.log("已有表格")
		} else {
			Swal.fire({
				icon: 'error',
				title: '請至應用程式頁面新增表格!',
				timer: 1500
			})
		}
		return event
	})
	//檢查是否重複創建
	kintone.events.on('app.record.create.submit', function(event) {
		var record = event.record
		var report_month_appid = kintone.app.getId()
		var labor_name = record['姓名'].value
		var record_month = record['月份'].value
		var record_year = record['年度'].value
		if (record_month > 12) {
			event.error = "月份輸入不符合規定!"
		} else {
			return async_GET(report_month_appid, labor_name, record_month, record_year).then(response => {
				console.log(response)
				if (response) {
					console.log("go")
				} else {
					console.log("stop")
					event.error = "月份重複或其他欄位輸入不符合規定!"
				}
				return event
			}, error => {
				console.log(error)
			})
		}
		return event
	})
	//更新表格 按鈕
	kintone.events.on('app.record.index.show', function(event) {
		var record = event.record
		//----------------------------------------------------------------------
		if (document.getElementById("options-id") !== null) {
			return;
		}
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
		let next_year = (int_year + 1).toString()
		const dropdown = new Kuc.Dropdown({
			//label: 'Fruit',
			requiredIcon: true,
			items: [{
				label: year,
				value: year
			}, {
				label: next_year,
				value: next_year
			}],
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
			items: [{
				label: "一月",
				value: "1"
			}, {
				label: "二月",
				value: "2"
			}, {
				label: "三月",
				value: "3"
			}, {
				label: "四月",
				value: "4"
			}, {
				label: "五月",
				value: "5"
			}, {
				label: "六月",
				value: "6"
			}, {
				label: "七月",
				value: "7"
			}, {
				label: "八月",
				value: "8"
			}, {
				label: "九月",
				value: "9"
			}, {
				label: "十月",
				value: "10"
			}, {
				label: "十一月",
				value: "11"
			}, {
				label: "十二月",
				value: "12"
			}],
			value: "1",
			selectedIndex: 0,
			//error: 'Error occurred!',
			className: 'options-class',
			id: 'options-month',
			visible: true,
			disabled: false
		});
		//按鈕事件
		menuButton.onclick = function() {
			var select_year = document.getElementById("options-year").value
			var select_month = document.getElementById("options-month").value
			async_GET_holiday(select_year).then(re => {
				console.log(re)
				var holiday_list = re
				//檢查是否已有表格
				var query = '年度=\"' + select_year + '\" and 月份=\"' + select_month + '\"'
				var GET_body = {
					'app': kintone.app.getId(),
					'query': query
				};
				kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp) {
					var record = resp.records
					var record_table = record[0]['出缺勤紀錄'].value
					if (record_table.length > 10) {
						console.log("已有表格")
						async_update_current_holiday(select_year, select_month).then(response => {
							//console.log(response)
						})
					} else {
						async_update_table(select_year, select_month, holiday_list).then(response => {
							//console.log(response)
						})
					}
				})
			})
		}
		kintone.app.getHeaderMenuSpaceElement().appendChild(dropdown);
		kintone.app.getHeaderMenuSpaceElement().appendChild(month_dropdown);
		kintone.app.getHeaderMenuSpaceElement().appendChild(menuButton);
	})
})()