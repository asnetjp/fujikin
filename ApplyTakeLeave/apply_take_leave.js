(function() {
	'use strict';
	/*---------------------------------------------------------------
  <功能簡介>
    主要功能->請假申請
  ---------------------------------------------------------------*/
	/*---------------------------------------------------------------
	 parameter
	---------------------------------------------------------------*/
	var holiday_appid = 188
	var month_report_appid = 144
	var year_labor_report_appid = 156
	const special_leaves = ["出産休暇", "在宅勤務", "外勤_国内", "出張_海外", "出勤振替","育嬰留職停薪休暇"]
	const cross_leaves = ["出産休暇", "在宅勤務", "外勤_国内", "出張_海外","育嬰留職停薪休暇"]
	const lang = kintone.getLoginUser().language;
	if (lang === 'zh') {
		var afternoon = "下午"
		var morning = "上午"
	}
	if (lang === 'ja') {
		var afternoon = "午後"
		var morning = "午前"
	}
	/*---------------------------------------------------------------
	 function cancel 員工年度紀錄
	---------------------------------------------------------------*/
	function async_cancel_year_labor_report(apply_laborid, record_list, month_report_year, update_date) {
		return new Promise((resolve, reject) => {
			var month_report_year_len = month_report_year.length
			//query 生成
			if (month_report_year_len > 1) {
				var query = '年度=\"' + month_report_year[0] + '\" and 員工編號=\"' + apply_laborid + '\" or' + ' 年度=\"' +
					month_report_year[1] + '\" and 員工編號=\"' + apply_laborid + '\"'
			} else {
				var query = '年度=\"' + month_report_year[0] + '\" and 員工編號=\"' + apply_laborid + '\"'
			}
			var GET_body = {
				'app': year_labor_report_appid,
				'query': query
			}
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp) {
				var record = resp.records
				//console.log(record)
				//取得符合的紀錄
				var record_choose_leave = record_list['選擇申請假別'].value
				var record_apply_days = record_list['總計申請天數'].value
				var record_start_time = record_list['選擇請假開始時間'].value
				var record_end_time = record_list['選擇請假結束時間'].value
				//員工年度紀錄
				var record_id = record[0]["記錄號碼"].value
				var labor_start_work_date = record[0]["到職日"].value
				var now_before_labor_start_work_days = Number(record[0]["到職日前的已休有給休暇"].value)
				var now_after_labor_start_work_days = Number(record[0]["到職日後的已休有給休暇"].value)
				//判斷是否為特休
				if (record_choose_leave.indexOf("有給休暇") != -1) {
					var before_labor_start_work_date = []
					var after_labor_start_work_date = []
					for (var t = 0; t < update_date.length; t++) {
						var moment_update_date = moment(update_date[t]).format("MM-DD")
						var moment_labor_start_work_date = moment(labor_start_work_date).format("MM-DD")
						var str_moment_update_date = moment().year() + "-" + moment_update_date.toString()
						var str_moment_labor_start_work_date = moment().year() + "-" + moment_labor_start_work_date.toString()
						//console.log("特休:" + str_moment_labor_start_work_date)
						if (moment_update_date > '12-20') {
							str_moment_labor_start_work_date = moment().year() + 1 + "-" + moment_labor_start_work_date.toString()
						}
						if (moment(str_moment_update_date).isBefore(str_moment_labor_start_work_date)) {
							before_labor_start_work_date.push(update_date[t])
						} else {
							after_labor_start_work_date.push(update_date[t])
						}
					}
					//檢查是否有半天
					//計算到職日前
					if (record_apply_days > 0.5 && before_labor_start_work_date.length > 0) { //請假超過半天
						if (record_start_time.indexOf(morning) != -1 && record_end_time.indexOf(afternoon + "17:30") != -1) {
							var before_labor_start_work_date_days = before_labor_start_work_date.length
						} else if (record_start_time.indexOf(morning) != -1 || record_end_time.indexOf(afternoon + "17:30") != -1) {
							var before_labor_start_work_date_days = before_labor_start_work_date.length - 0.5
						} else {
							var before_labor_start_work_date_days = before_labor_start_work_date.length - 1
						}
					} else { //請0.5天
						if (before_labor_start_work_date.length > 0) {
							var before_labor_start_work_date_days = 0.5
						} else {
							var before_labor_start_work_date_days = 0
						}
					}
					//計算到職日後
					if (record_apply_days > 0.5 && after_labor_start_work_date.length > 0) { //請假超過半天
						if (record_start_time.indexOf(morning) != -1 && record_end_time.indexOf(afternoon + "17:30") != -1) {
							var after_labor_start_work_date_days = after_labor_start_work_date.length
						} else if (record_start_time.indexOf(morning) != -1 || record_end_time.indexOf(afternoon + "17:30") != -1) {
							var after_labor_start_work_date_days = after_labor_start_work_date.length - 0.5
						} else {
							var after_labor_start_work_date_days = after_labor_start_work_date.length - 1
						}
					} else { //請0.5天
						if (after_labor_start_work_date.length > 0) {
							var after_labor_start_work_date_days = 0.5
						} else {
							var after_labor_start_work_date_days = 0
						}
					}
					//console.log(before_labor_start_work_date_days)
					//console.log(after_labor_start_work_date_days)
					var record_data = {
						"到職日前的已休有給休暇": {
							"value": now_before_labor_start_work_days - before_labor_start_work_date_days
						},
						"到職日後的已休有給休暇": {
							"value": now_after_labor_start_work_days - after_labor_start_work_date_days
						}
					}
				} else {
					var record_choose_already_use = record[0]["已休" + record_choose_leave].value
					var apply_choose_use = "已休" + record_choose_leave
					var record_data = {
						[apply_choose_use]: {
							"value": Number(record_choose_already_use) - Number(record_apply_days)
						}
					}
				}
				//PUT 格式
				var PUT_body = {
					'app': year_labor_report_appid,
					'id': record_id,
					'record': record_data
				}
				//PUT 員工年度紀錄
				kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', PUT_body, function(resp) {
					// success
					//console.log(resp);
					resolve('PUT success')
				}, function(error) {
					// error
					//console.log(error);
				});
			}).catch(function(err) {
				//error
				reject(err)
			})
		})
	}
/*---------------------------------------------------------------
	 function PUT 員工年度紀錄
---------------------------------------------------------------*/
	function async_PUT_year_labor_report(apply_laborid, record_list, month_report_year, update_date) {
		return new Promise((resolve, reject) => {
			var month_report_year_len = month_report_year.length
			//query 生成
			if (month_report_year_len > 1) {
				var query = '年度=\"' + month_report_year[0] + '\" and 員工編號=\"' + apply_laborid + '\" or' + ' 年度=\"' +
					month_report_year[1] + '\" and 員工編號=\"' + apply_laborid + '\"'
			} else {
				var query = '年度=\"' + month_report_year[0] + '\" and 員工編號=\"' + apply_laborid + '\"'
			}
			var GET_body = {
				'app': year_labor_report_appid,
				'query': query
			}
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp) {
				var record = resp.records
				//console.log(record)
				//取得符合的紀錄ㄑ
				var record_choose_leave = record_list['選擇申請假別'].value
				var record_apply_days = record_list['總計申請天數'].value
				var record_start_time = record_list['選擇請假開始時間'].value
				var record_end_time = record_list['選擇請假結束時間'].value
				//員工年度紀錄
				var record_id = record[0]["記錄號碼"].value
				var labor_start_work_date = record[0]["到職日"].value
				var now_before_labor_start_work_days = Number(record[0]["到職日前的已休有給休暇"].value)
				var now_after_labor_start_work_days = Number(record[0]["到職日後的已休有給休暇"].value)
				//判斷是否為特休
				if (record_choose_leave.indexOf("有給休暇") != -1) {
					var before_labor_start_work_date = []
					var after_labor_start_work_date = []
					for (var t = 0; t < update_date.length; t++) {
						var moment_update_date = moment(update_date[t]).format("MM-DD")
						var moment_labor_start_work_date = moment(labor_start_work_date).format("MM-DD")
						var str_moment_update_date = moment().year() + "-" + moment_update_date.toString()
						var str_moment_labor_start_work_date = moment().year() + "-" + moment_labor_start_work_date.toString()
						//console.log("特休:" + str_moment_labor_start_work_date)
						if (moment_update_date > '12-20') {
							str_moment_labor_start_work_date = moment().year() + 1 + "-" + moment_labor_start_work_date.toString()
						}
						if (moment(str_moment_update_date).isBefore(str_moment_labor_start_work_date)) {
							before_labor_start_work_date.push(update_date[t])
						} else {
							after_labor_start_work_date.push(update_date[t])
						}
					}
					//檢查是否有半天
					//計算到職日前
					if (record_apply_days > 0.5 && before_labor_start_work_date.length > 0) { //請假超過半天
						if (record_start_time.indexOf(morning) != -1 && record_end_time.indexOf(afternoon + "17:30") != -1) {
							var before_labor_start_work_date_days = before_labor_start_work_date.length
						} else if (record_start_time.indexOf(morning) != -1 || record_end_time.indexOf(afternoon + "17:30") != -1) {
							var before_labor_start_work_date_days = before_labor_start_work_date.length - 0.5
						} else {
							var before_labor_start_work_date_days = before_labor_start_work_date.length - 1
						}
					} else { //請0.5天
						if (before_labor_start_work_date.length > 0) {
							var before_labor_start_work_date_days = 0.5
						} else {
							var before_labor_start_work_date_days = 0
						}
					}
					//計算到職日後
					if (record_apply_days > 0.5 && after_labor_start_work_date.length > 0) { //請假超過半天
						if (record_start_time.indexOf(morning) != -1 && record_end_time.indexOf(afternoon + "17:30") != -1) {
							var after_labor_start_work_date_days = after_labor_start_work_date.length
						} else if (record_start_time.indexOf(morning) != -1 || record_end_time.indexOf(afternoon + "17:30") != -1) {
							var after_labor_start_work_date_days = after_labor_start_work_date.length - 0.5
						} else {
							var after_labor_start_work_date_days = after_labor_start_work_date.length - 1
						}
					} else { //請0.5天
						if (after_labor_start_work_date.length > 0) {
							var after_labor_start_work_date_days = 0.5
						} else {
							var after_labor_start_work_date_days = 0
						}
					}
					//console.log(before_labor_start_work_date_days)
					//console.log(after_labor_start_work_date_days)
					var record_data = {
						"到職日前的已休有給休暇": {
							"value": now_before_labor_start_work_days + before_labor_start_work_date_days
						},
						"到職日後的已休有給休暇": {
							"value": now_after_labor_start_work_days + after_labor_start_work_date_days
						}
					}
				} else {
					var record_choose_already_use = record[0]["已休" + record_choose_leave].value
					var apply_choose_use = "已休" + record_choose_leave
					var record_data = {
						[apply_choose_use]: {
							"value": Number(record_choose_already_use) + Number(record_apply_days)
						}
					}
				}
				//PUT 格式
				var PUT_body = {
					'app': year_labor_report_appid,
					'id': record_id,
					'record': record_data
				}
				////console.log(PUT_body)
				//PUT 員工年度紀錄
				kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', PUT_body, function(resp) {
					// success
					//console.log(resp);
					resolve('PUT success')
				}, function(error) {
					// error
					//console.log(error);
				});
			}).catch(function(err) {
				//error
				reject(err)
			})
		})
	}
/*---------------------------------------------------------------
 function GET 考勤表
---------------------------------------------------------------*/
	function async_GET_month_report(apply_laborID, update_date, month_report_month, month_report_year) {
		return new Promise((resolve, reject) => {
			//query 生成
			if (month_report_year.length > 1) {
				if (month_report_month.length == 2) {
					if (month_report_month[1] == 1) {
						var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\")' + 'or' + '(年度=\"' +
							month_report_year[1] + '\" and 月份=\"' + month_report_month[1] + '\")'
					} else {
						var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\")' + 'or' + '(年度=\"' +
							month_report_year[0] + '\" and 月份=\"' + month_report_month[1] + '\")'
					}
				} else if (month_report_month.length == 3 && month_report_month[1] == 1) {
					var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\")' + 'or' + '(年度=\"' +
						month_report_year[1] + '\" and 月份=\"' + month_report_month[1] + '\")' + 'or' + '(年度=\"' + month_report_year[1] +
						'\" and 月份=\"' + month_report_month[2] + '\")'
				} else if (month_report_month.length == 3 && month_report_month[2] == 1) {
					var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\")' + 'or' + '(年度=\"' +
						month_report_year[0] + '\" and 月份=\"' + month_report_month[1] + '\")' + 'or' + '(年度=\"' + month_report_year[1] +
						'\" and 月份=\"' + month_report_month[2] + '\")'
				} else {
					var query = '(年度=\"' + month_report_year[1] + '\" and 月份=\"' + month_report_month[0] + '\" and 員工編號=\"' +
						apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] +
						'\" and 員工編號=\"' + apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[1] + '\" and 月份=\"' +
						month_report_month[0] + '\" and 員工編號=\"' + apply_laborid + '\")'
				}
			} else {
				var query = '年度=\"' + month_report_year[0] + '\" and (月份=\"' + month_report_month[0] + '\" or 月份=\"' +
					month_report_month[month_report_month.length - 1] + '\")'
			}
			var GET_body = {
				'app': month_report_appid,
				'query': query
			};
			kintone.api(kintone.api.url('/k/v1/records', true), 'GET', GET_body, function(resp) {
				// success
				resolve(resp)
			}, function(error) {
				// error
				//console.log(error);
				reject(error)
			});
		})
	}
/*---------------------------------------------------------------
 function cancel 考勤表
---------------------------------------------------------------*/
	function async_cancel_PUT_month_report(apply_laborid, record_list, update_date, month_report_month, month_report_year) {
		//
		return new Promise((resolve, reject) => {
			//query 生成
			if (month_report_year.length > 1) {
				if (month_report_month.length == 2) {
					if (month_report_month[1] == 1) {
						var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\" and 員工編號=\"' +
							apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[1] + '\" and 月份=\"' + month_report_month[1] +
							'\" and 員工編號=\"' + apply_laborid + '\")'
					} else {
						var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\" and 員工編號=\"' +
							apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[1] +
							'\" and 員工編號=\"' + apply_laborid + '\")'
					}
				} else if (month_report_month.length == 3 && month_report_month[1] == 1) {
					var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\" and 員工編號=\"' +
						apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[1] + '\" and 月份=\"' + month_report_month[1] +
						'\" and 員工編號=\"' + apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[1] + '\" and 月份=\"' +
						month_report_month[2] + '\" and 員工編號=\"' + apply_laborid + '\")'
				} else if (month_report_month.length == 3 && month_report_month[2] == 1) {
					var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\" and 員工編號=\"' +
						apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[1] +
						'\" and 員工編號=\"' + apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[1] + '\" and 月份=\"' +
						month_report_month[2] + '\" and 員工編號=\"' + apply_laborid + '\")'
				} else {
					var query = '(年度=\"' + month_report_year[1] + '\" and 月份=\"' + month_report_month[0] + '\" and 員工編號=\"' +
						apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] +
						'\" and 員工編號=\"' + apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[1] + '\" and 月份=\"' +
						month_report_month[0] + '\" and 員工編號=\"' + apply_laborid + '\")'
				}
			} else {
				var query = '年度=\"' + month_report_year[0] + '\" and (月份=\"' + month_report_month[0] + '\" or 月份=\"' +
					month_report_month[month_report_month.length - 1] + '\")' + 'and 員工編號=\"' + apply_laborid + '\"'
			}
			var GET_body = {
				'app': month_report_appid,
				'query': query
			}
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp) {
				var record = resp.records
				//console.log(record)
				//取得符合月份的紀錄
				var PUT_array = []
				var record_name = record_list['姓名'].value
				var record_laborID = record_list['員工編號'].value
				var record_choose_leave = record_list['選擇申請假別'].value
				var record_start_date = record_list['選擇請假開始日期'].value
				var record_end_date = record_list['選擇請假結束日期'].value
				var record_start_time = record_list['選擇請假開始時間'].value
				var record_end_time = record_list['選擇請假結束時間'].value
				var record_days = record_list['總計申請天數'].value
				//更新 扣除天數
				var update_days = Number(record[0][record_choose_leave].value) - Number(record_days)
				//考勤表紀錄
				for (var i = 0; i < record.length; i++) {
					var month_report_year = record[i]['年度'].value
					var month_report_month_LOOP = record[i]['月份'].value
					var month_report_labor = record[i]['姓名'].value
					var month_report_table = record[i]['出缺勤紀錄'].value
					var month_report_laborID = record[i]['員工編號'].value
					var month_report_record_id = record[i]['記錄號碼'].value
					var month_report_choose_leave = record[i][record_choose_leave].value
					//console.log(record_choose_leave + "天數" + month_report_choose_leave)
					var count_pregnant_list = []
					//update_date LOOP
					for (var j = 0; j < update_date.length; j++) {
						if (month_report_month_LOOP == 1) {
							var month = 12
						} else {
							var month = month_report_month_LOOP - 1
						}
						var last_month_last_day = new Date(month_report_year, month, 0).getDate()
						var last_month_last_day_QQ = Number(last_month_last_day)
						var date = new Date(update_date[j]).getDate()
						var date_QQ = Number(date)
						//產假
						//計算出産休暇天數
						if (special_leaves.includes(record_choose_leave)) { //if ture
							count_pregnant_list.push(update_date[j])
						}
						//檢查日期 屬於哪個月考勤表
						if (date_QQ > 20) {
							var check_month = new Date(update_date[j]).getMonth() + 2 //即為下個月的考勤表
							if (check_month > 12) {
								var check_month = 1
							}
						} else {
							var check_month = new Date(update_date[j]).getMonth() + 1
						}
						if (month_report_laborID == record_laborID && check_month == month_report_month_LOOP) { //名字+月份正確
							if (date_QQ > 20) {
								var k = date_QQ - 21
							} else {
								var k = last_month_last_day_QQ - 21 + date_QQ
							}
							var des = month_report_table[k].value["備註"].value
							var json = JSON.parse(month_report_table[k].value["備註code"].value)
							if (json["補打卡"] != "") {
								json["休暇"] = ""
								json["補打卡"] = json["補打卡"]
							} else {
								json["休暇"] = ""
								json["補打卡"] = ""
							}
							var str_json = JSON.stringify(json)
							//檢查是否已有紀錄
							if (des.indexOf("休暇") != -1 || des.indexOf("出張") != -1 || des.indexOf("その他") != -1 || des.indexOf("在宅勤務") !=
								-1) {
								//更新表格紀錄
								if (record_start_date == record_end_date) { //請假一天內
									var day_list = ['日', '一', '二', '三', '四', '五', '六'];
									var date = new Date(update_date[j])
									var day = date.getDay()
									var get_day = day_list[day]
									month_report_table[k] = {
										"value": {
											"日期": {
												"value": update_date[j]
											},
											"星期": {
												"value": get_day
											},
											"上班時間": {
												"value": month_report_table[k].value["上班時間"].value
											},
											"下班時間": {
												"value": month_report_table[k].value["下班時間"].value
											},
											"工時": {
												"value": month_report_table[k].value["工時"].value
											},
											"實際工時": {
												"value": month_report_table[k].value["實際工時"].value
											},
											"備註": {
												"value": json["休暇"] + json["補打卡"]
											},
											"備註code": {
												"value": str_json
											}
										}
									}
								} else {
									//請假多日
									var day_list = ['日', '一', '二', '三', '四', '五', '六'];
									var date = new Date(update_date[j])
									var day = date.getDay()
									var get_day = day_list[day]
									month_report_table[k] = {
										"value": {
											"日期": {
												"value": update_date[j]
											},
											"星期": {
												"value": get_day
											},
											"上班時間": {
												"value": month_report_table[k].value["上班時間"].value
											},
											"下班時間": {
												"value": month_report_table[k].value["下班時間"].value
											},
											"工時": {
												"value": month_report_table[k].value["工時"].value
											},
											"實際工時": {
												"value": month_report_table[k].value["實際工時"].value
											},
											"備註": {
												"value": json["休暇"] + json["補打卡"]
											},
											"備註code": {
												"value": str_json
											}
										}
									}
								}
							} else if (des.indexOf("補打卡") != -1) {
								var day_list = ['日', '一', '二', '三', '四', '五', '六'];
								var date = new Date(update_date[j])
								var day = date.getDay()
								var get_day = day_list[day]
								month_report_table[k] = {
									"value": {
										"日期": {
											"value": update_date[j]
										},
										"星期": {
											"value": get_day
										},
										"上班時間": {
											"value": month_report_table[k].value["上班時間"].value
										},
										"下班時間": {
											"value": month_report_table[k].value["下班時間"].value
										},
										"工時": {
											"value": month_report_table[k].value["工時"].value
										},
										"實際工時": {
											"value": month_report_table[k].value["實際工時"].value
										},
										"備註": {
											"value": json["休暇"] + json["補打卡"]
										},
										"備註code": {
											"value": str_json
										}
									}
								}
							} else {
								//更新表格紀錄
								var day_list = ['日', '一', '二', '三', '四', '五', '六'];
								var date = new Date(update_date[j])
								var day = date.getDay()
								var get_day = day_list[day]
								month_report_table[k] = {
									"value": {
										"日期": {
											"value": update_date[j]
										},
										"星期": {
											"value": get_day
										},
										"上班時間": {
											"value": ""
										},
										"下班時間": {
											"value": ""
										},
										"工時": {
											"value": ""
										},
										"實際工時": {
											"value": ""
										},
										"備註": {
											"value": json["休暇"] + json["補打卡"]
										},
										"備註code": {
											"value": str_json
										}
									}
								}
							}
						}
					}
					if (special_leaves.includes(record_choose_leave)) {
						var pregnant_len = count_pregnant_list.length
						//console.log("pregnant_len=" + pregnant_len)
						if ((record_start_time.indexOf("13:30") != -1 || record_start_time.indexOf("12:45") != -1)) {
							var pregnant_len = pregnant_len - 0.5
						}
						if (record_end_time.indexOf("17:30") == -1) {
							var pregnant_len = pregnant_len - 0.5
						}
						//console.log("特殊假" + pregnant_len + "天")
						var re = {
							"id": month_report_record_id,
							"record": {
								[record_choose_leave]: {
									"value": Number(record[0][record_choose_leave].value) - pregnant_len
								},
								"出缺勤紀錄": {
									"value": month_report_table
								}
							}
						}
					} else {
						var re = {
							"id": month_report_record_id,
							"record": {
								[record_choose_leave]: {
									"value": update_days
								},
								"出缺勤紀錄": {
									"value": month_report_table
								}
							}
						}
					}
					PUT_array.push(re)
				}
				//PUT 格式
				var PUT_body = {
					'app': month_report_appid,
					'records': PUT_array
				}
				//PUT 考勤表
				kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', PUT_body, function(resp) {
					// success
					//console.log(resp);
					resolve('PUT success')
				}, function(error) {
					// error
					//console.log(error);
				});
			}).catch(function(err) {
				//error
				//reject(err)
				//console.log(err)
			})
		})
	}
/*---------------------------------------------------------------
 function PUT 考勤表
---------------------------------------------------------------*/ 
	function async_PUT_month_report(apply_laborid, record_list, update_date, month_report_month, month_report_year) {
		//
		return new Promise((resolve, reject) => {
			//query 生成
			if (month_report_year.length > 1) {
				if (month_report_month.length === 2) {
					if (month_report_month[1] === 1) {
						var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\" and 員工編號=\"' +
							apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[1] + '\" and 月份=\"' + month_report_month[1] +
							'\" and 員工編號=\"' + apply_laborid + '\")'
					} else {
						var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\" and 員工編號=\"' +
							apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[1] +
							'\" and 員工編號=\"' + apply_laborid + '\")'
					}
				} else if (month_report_month.length === 3 && month_report_month[1] === 1) {
					var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\" and 員工編號=\"' +
						apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[1] + '\" and 月份=\"' + month_report_month[1] +
						'\" and 員工編號=\"' + apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[1] + '\" and 月份=\"' +
						month_report_month[2] + '\" and 員工編號=\"' + apply_laborid + '\")'
				} else if (month_report_month.length === 3 && month_report_month[2] === 1) {
					var query = '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] + '\" and 員工編號=\"' +
						apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[1] +
						'\" and 員工編號=\"' + apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[1] + '\" and 月份=\"' +
						month_report_month[2] + '\" and 員工編號=\"' + apply_laborid + '\")'
				} else {
					var query = '(年度=\"' + month_report_year[1] + '\" and 月份=\"' + month_report_month[0] + '\" and 員工編號=\"' +
						apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[0] + '\" and 月份=\"' + month_report_month[0] +
						'\" and 員工編號=\"' + apply_laborid + '\")' + 'or' + '(年度=\"' + month_report_year[1] + '\" and 月份=\"' +
						month_report_month[0] + '\" and 員工編號=\"' + apply_laborid + '\")'
				}
			} else {
				var query = '年度=\"' + month_report_year[0] + '\" and (月份=\"' + month_report_month[0] + '\" or 月份=\"' +
					month_report_month[month_report_month.length - 1] + '\")' + 'and 員工編號=\"' + apply_laborid + '\"'
			}
			var GET_body = {
				'app': month_report_appid,
				'query': query
			}
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp) {
				var record = resp.records
				//console.log(record)
				if (record.length < 1) {
					reject("GET error")
				} else {
					//取得符合月份的紀錄
					var PUT_array = []
					var record_name = record_list['姓名'].value
					var record_laborID = record_list['員工編號'].value
					var record_choose_leave = record_list['選擇申請假別'].value
					var record_start_date = record_list['選擇請假開始日期'].value
					var record_end_date = record_list['選擇請假結束日期'].value
					var record_start_time = record_list['選擇請假開始時間'].value
					var record_end_time = record_list['選擇請假結束時間'].value
					var record_days = record_list['總計申請天數'].value
					//一般請假更新天數
					var update_days = Number(record_days) + Number(record[0][record_choose_leave].value)
					//考勤表紀錄
					for (var i = 0; i < record.length; i++) {
						var month_report_year = record[i]['年度'].value
						var month_report_month_LOOP = record[i]['月份'].value
						var month_report_labor = record[i]['姓名'].value
						var month_report_laborID = record[i]['員工編號'].value
						var month_report_table = record[i]['出缺勤紀錄'].value
						var month_report_record_id = record[i]['記錄號碼'].value
						//var start_work_date = record[i]['到職日'].value
						//update_date LOOP
						var count_pregnant_list = []
						for (var j = 0; j < update_date.length; j++) {
							if (month_report_month_LOOP == 1) {
								var month = 12
							} else {
								var month = month_report_month_LOOP - 1
							}
							var last_month_last_day = new Date(month_report_year, month, 0).getDate()
							var last_month_last_day_QQ = Number(last_month_last_day)
							var date = new Date(update_date[j]).getDate()
							var date_QQ = Number(date)
							//產假計算
							//計算出産休暇天數
							if (special_leaves.includes(record_choose_leave)) {
								count_pregnant_list.push(update_date[j])
							}
							//檢查日期 屬於哪個月考勤表
							if (date_QQ > 20) {
								var check_month = new Date(update_date[j]).getMonth() + 2 //即為下個月的考勤表
								if (check_month > 12) {
									var check_month = 1
								}
							} else {
								var check_month = new Date(update_date[j]).getMonth() + 1
							}
							if (month_report_laborID == record_laborID && check_month == month_report_month_LOOP) { //名字+月份正確
								if (date_QQ > 20) {
									var k = date_QQ - 21
								} else {
									var k = last_month_last_day_QQ - 21 + date_QQ
								}
								//檢查是否已有紀錄
								//更新表格紀錄
								if (record_start_date == record_end_date) { //請假一天內
									var day_list = ['日', '一', '二', '三', '四', '五', '六'];
									var date = new Date(update_date[j])
									var day = date.getDay()
									var get_day = day_list[day]
									//修改備註顯示
									//開始時間
									if (record_start_time.indexOf(morning + "8:45") != -1) {
										var start_time = "8:45"
									} else if (record_start_time.indexOf(afternoon + "12:45") != -1) {
										var start_time = "12:45"
									} else {
										var start_time = "13:30"
									}
									//結束時間
									if (record_end_time.indexOf(afternoon + "12:45") != -1) {
										var end_time = "12:45"
									} else if (record_end_time.indexOf(afternoon + "13:30") != -1) {
										var end_time = "13:30"
									} else {
										var end_time = "17:30"
									}
									//顯示在備註
									var str_description = record_choose_leave + "  " + start_time + "~" + end_time
									var json = JSON.parse(month_report_table[k].value["備註code"].value)
									if (json["補打卡"] != "") {
										json["休暇"] = str_description
										json["補打卡"] = "," + json["補打卡"]
									} else {
										json["休暇"] = str_description + json["休暇"]
										json["補打卡"] = ""
									}
									var str_json = JSON.stringify(json)
									month_report_table[k] = {
										"value": {
											"日期": {
												"value": update_date[j]
											},
											"星期": {
												"value": get_day
											},
											"上班時間": {
												"value": month_report_table[k].value["上班時間"].value
											},
											"下班時間": {
												"value": month_report_table[k].value["下班時間"].value
											},
											"工時": {
												"value": month_report_table[k].value["工時"].value
											},
											"實際工時": {
												"value": month_report_table[k].value["實際工時"].value
											},
											"備註": {
												"value": json["休暇"] + json["補打卡"]
											},
											"備註code": {
												"value": str_json
											}
										}
									}
								} else {
									//修改備註顯示
									//開始時間
									if (record_start_time.indexOf(morning + "8:45") != -1) {
										var start_time = "8:45"
									} else if (record_start_time.indexOf(afternoon + "12:45") != -1) {
										var start_time = "12:45"
									} else {
										var start_time = "13:30"
									}
									//結束時間
									if (record_end_time.indexOf(afternoon + "12:45") != -1) {
										var end_time = "12:45"
									} else if (record_end_time.indexOf(afternoon + "13:30") != -1) {
										var end_time = "13:30"
									} else {
										var end_time = "17:30"
									}
									//請假多日
									if (record_start_date == month_report_table[k].value["日期"].value) {
										var str = record_choose_leave + start_time + "~17:30"
									} else if (record_end_date == month_report_table[k].value["日期"].value) {
										var str = record_choose_leave + "8:45~" + end_time
									} else {
										var str = record_choose_leave + "8:45~17:30"
									}
									var json = JSON.parse(month_report_table[k].value["備註code"].value)
									if (json["補打卡"] != "") {
										json["休暇"] = str
										json["補打卡"] = "," + json["補打卡"]
									} else {
										json["休暇"] = str
										json["補打卡"] = ""
									}
									var day_list = ['日', '一', '二', '三', '四', '五', '六'];
									var date = new Date(update_date[j])
									var day = date.getDay()
									var get_day = day_list[day]
									var str_json = JSON.stringify(json)
									month_report_table[k] = {
										"value": {
											"日期": {
												"value": update_date[j]
											},
											"星期": {
												"value": get_day
											},
											"上班時間": {
												"value": month_report_table[k].value["上班時間"].value
											},
											"下班時間": {
												"value": month_report_table[k].value["下班時間"].value
											},
											"工時": {
												"value": month_report_table[k].value["工時"].value
											},
											"實際工時": {
												"value": month_report_table[k].value["實際工時"].value
											},
											"備註": {
												"value": json["休暇"] + json["補打卡"]
											},
											"備註code": {
												"value": str_json
											}
										}
									}
								}
							}
						}
						if (special_leaves.includes(record_choose_leave)) {
							var pregnant_len = count_pregnant_list.length
							//console.log("pregnant_len=" + pregnant_len)
							if ((record_start_time.indexOf("13:30") != -1 || record_start_time.indexOf("12:45") != -1)) {
								var pregnant_len = pregnant_len - 0.5
							}
							if (record_end_time.indexOf("17:30") == -1) {
								var pregnant_len = pregnant_len - 0.5
							}
							//console.log("產假" + pregnant_len + "天")
							var re = {
								"id": month_report_record_id,
								"record": {
									[record_choose_leave]: {
										"value": pregnant_len + Number(record[0][record_choose_leave].value)
									},
									"出缺勤紀錄": {
										"value": month_report_table
									}
								}
							}
						} else {
							var re = {
								"id": month_report_record_id,
								"record": {
									[record_choose_leave]: {
										"value": update_days
									},
									"出缺勤紀錄": {
										"value": month_report_table
									}
								}
							}
						}
						PUT_array.push(re)
					}
					//PUT 格式
					var PUT_body = {
						'app': month_report_appid,
						'records': PUT_array
					}
					//PUT 考勤表
					kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', PUT_body, function(resp) {
						// success
						console.log(resp);
						resolve('PUT success')
					}, function(error) {
						// error
						console.log(error);
					});
				}
			}).catch(function(err) {
				//error
				reject(err)
			})
		})
	}
/*---------------------------------------------------------------
 event
---------------------------------------------------------------*/
	// 取消欄位的顯示與隱藏
	kintone.events.on(['app.record.detail.show', 'app.record.create.show'], function(event) {
		var record = event.record
		if ("狀態" in record) {
			var status = record["狀態"].value
		} else {
			var status = "create"
		}
		if (status == "審核完成" || status == "取消完成" || status == "承認") {
			//
		} else {
			kintone.app.record.setFieldShown('取消申請', false);
		}
	})
	//限制編輯
	kintone.events.on(["app.record.edit.show", "app.record.index.edit.show"], function(event) {
		var record = event.record
		record['員工編號'].disabled = true
		record['選擇申請假別'].disabled = true
		record['請假開始日期'].disabled = true
		record['請假結束日期'].disabled = true
		record['選擇請假開始時間'].disabled = true
		record['選擇請假結束時間'].disabled = true
		record['總計申請天數'].disabled = true
		record['事由'].disabled = true
		var status = record["狀態"].value
		//console.log(status)
		if (status == "未處理" || status == "未処理") {
			kintone.app.record.setFieldShown('取消申請', false);
			record['員工編號'].disabled = false
			record['選擇申請假別'].disabled = false
			record['請假開始日期'].disabled = false
			record['請假結束日期'].disabled = false
			record['選擇請假開始時間'].disabled = false
			record['選擇請假結束時間'].disabled = false
			record['總計申請天數'].disabled = false
			record['事由'].disabled = false
		} else if (status == "申請中") {
			kintone.app.record.setFieldShown('取消申請', false);
		} else {
			//
		}
		return event
	})
	//請假申請 限制
	kintone.events.on(['app.record.create.submit', 'app.record.edit.submit'], function(event) {
		var record = event.record
		var apply_boss = record["呈核主管"].value
		var apply_laborID = record["員工編號"].value
		var apply_type = record["選擇申請假別"].value
		var apply_start_date = record["請假開始日期"].value
		var apply_end_date = record["請假結束日期"].value
		var apply_start_time = record["選擇請假開始時間"].value
		var apply_end_time = record["選擇請假結束時間"].value
		//--------------------------------
		var apply_days = record["總計申請天數"].value
		var start = moment(apply_start_date)
		var end = moment(apply_end_date)
		if (apply_start_date == apply_end_date) {
			//防止選擇同一日期同一時間
			//新增日文判斷
			if ((apply_start_time == "下午12:45" || apply_start_time == "下午13:30" || apply_start_time == "午後12:45" ||
					apply_start_time == "午後13:30") && (apply_end_time == "下午12:45" || apply_end_time == "下午13:30" || apply_end_time ==
					"午後12:45" || apply_end_time == "午後13:30")) {
				event.error = "選擇錯誤, 請確認日期或是時間是否正確!!"
				return event
			} else {
				if (apply_start_time.indexOf(afternoon) != -1 || apply_end_time != afternoon + "17:30") { //|| apply_start_time.indexOf("午後")!=-1 || apply_end_time!="午後17:30"
					var correct_days = 0.5
				} else {
					var correct_days = 1
				}
			}
		} else {
			var minus_date = end.diff(start, 'day') + 1
			if (apply_start_time.indexOf(afternoon) != -1 && apply_end_time != afternoon + "17:30") {
				var correct_days = minus_date - 1
			} else if (apply_start_time.indexOf(afternoon) != -1 || apply_end_time != afternoon + "17:30") {
				var correct_days = minus_date - 0.5
			} else {
				var correct_days = minus_date
			}
		}
		if (correct_days == apply_days) {
			//
		} else {
			event.error = "總計申請天數錯誤, 計算結果為" + correct_days + ",請確認!!"
			return event
		}

		// 特定假別可以跨考20日
		let corss_validate = false;
		if(cross_leaves.indexOf(apply_type) >= 0){
			corss_validate = true;
		}

		// 判斷是否跨考勤表
		var isRangeValid = start.date() <= 20 && end.date() >= 21;
		if (isRangeValid && corss_validate === false) {
			event.error = "輸入日期不可跨考勤月份，請分開申請"
				return event
		}

		var start_d = new Date(apply_start_date)
		var start_d_date = start_d.getDate()
		var start_d_month = start_d.getMonth() + 1
		var end_d = new Date(apply_end_date)
		var end_d_date = end_d.getDate()
		var end_d_month = end_d.getMonth() + 1
		//console.log(start_d_month + "-" + start_d_date + "~" + end_d_month + "-" + end_d_date)
		var this_year = start_d.getFullYear()
		if (start_d_date > 20) {
			var start_m = start_d_month + 1
			if (end_m > 12) {
				var end_m = start_d_month + 1 - 12
			}
		} else {
			var start_m = start_d_month
		}
		if (end_d_date > 20) {
			var end_m = end_d_month + 1
			if (end_m > 12) {
				var end_m = end_d_month + 1 - 12
			}
		} else {
			var end_m = end_d_month
		}
		//----
		var month_report_month = []
		var month_report_year = [this_year]
		var update_date = []
		//生成month_report_year
		var check_range_start = new Date(this_year + "-12-20")
		if (start_d > check_range_start || end_d > check_range_start) {
			var month_len = 12 - start_m + 1 + end_m
			month_report_year.push(this_year + 1) //將隔年加入list
		} else {
			var month_len = end_m - start_m + 1
		}
		//生成month_report_month  list
		for (var i = 0; i < month_len; i++) {
			if (start_m + i > 12) {
				month_report_month.push(start_m + i - 12)
			} else {
				month_report_month.push(start_m + i)
			}
		}
		//生成 update_date
		var currentDate = moment(apply_start_date);
		var stopDate = moment(apply_end_date);
		var check_sat_sun = []
		while (currentDate <= stopDate) {
			var row_date = moment(currentDate).format('YYYY-MM-DD')
			var date = new Date(row_date)
			var day = date.getDay()
			if (day == 6 || day == 0) {
				check_sat_sun.push(day)
			}
			update_date.push(moment(currentDate).format('YYYY-MM-DD'))
			currentDate = moment(currentDate).add(1, 'days');
		}
		//console.log("檢查是否有六,日")
		//console.log(check_sat_sun)
		if (special_leaves.includes(apply_type)) {
			//
		} else if (check_sat_sun.length > 0) {
			event.error = "請假包含六日!請重新確認!"
			return event
		}
		//console.log(update_date)
		//console.log(month_report_month)//相當於 幾個月的考勤表
		//console.log(month_report_year)
		if (month_report_month.length > 3 && (apply_type != "出産休暇" || apply_type != "在宅勤務" || apply_type != "外勤_国内" ||
				apply_type != "出張_海外" || apply_type != "出勤振替")) {
			//error
			event.error = "請假天數超過規定!"
			return event
		} else {
			/*
			//確認是否有考勤表
			async_GET_month_report(apply_laborID, update_date, month_report_month, month_report_year).then(
			  resp => {
			    //console.log(resp)
			    if(resp=="GET error"){
			      event.error = "考勤表須新增才可更新紀錄!"
			    }
			  }
			)*/
		}
		//FTI009權限限制
		/*{id: '20', code: 'FTI009', name: '楊淑真', email: 'alice@fujikin.com.tw', url: '', …}code: "FTI009"email: "alice@fujikin.com.tw"employeeNumber: "009"extensionNumber: "109"
		id: "20"isGuest: falselanguage: "zh"mobilePhone: "0926-124-858"name: "楊淑真"phone: ""timezone: "Asia/Taipei"url: ""[[Prototype]]: Object*/
		var user = kintone.getLoginUser();
		//console.log(user);
		if (apply_laborID !== "009" && user["code"] == "FTI009") {
			event.error = "選擇錯誤, 您只能幫自己請假!"
			return event
		}
		//禁止呈核自己
		/*//console.log(apply_boss)
		if(user["code"]!=="FTI051"){
		  for(var i=0;i<apply_boss.length;i++){
		    if(apply_boss[i]["code"]==user["code"]){
		      //console.log(apply_boss[i]["code"])
		      event.error = "選擇錯誤, 您不能呈核給自己!"
		      return event
		    }
		  }
		}*/
		//特殊假
		//console.log(apply_type)
		if (special_leaves.includes(apply_type)) {
			/*var query = ""
			for(var i=0;i<update_date.length;i++){
			  if(i==0){
			    var query = '假日日期 =\"' + update_date[i] + 'T09:00:00+0800\"'
			  }else{
			    var query = query + 'or 假日日期 =\"' + update_date[i] + 'T09:00:00+0800\"'
			  }
			}
			var GET_body = {
			  'app': holiday_appid,
			  'query': query
			};
			return kintone.api(kintone.api.url('/k/v1/records', true), 'GET', GET_body).then(function(re) {    
			  if(re.records.length>0){
			    event.error = "選擇日期包含假日!"
			    return event;    
			  } 
			}).catch(function(resp) {    
			  // error   
			  event.error = resp.message;    
			  return event;    
			}); */
		} else {
			var query = ""
			for (var i = 0; i < update_date.length; i++) {
				if (i == 0) {
					var query = '假日日期 =\"' + update_date[i] + 'T09:00:00+0800\"'
				} else {
					var query = query + 'or 假日日期 =\"' + update_date[i] + 'T09:00:00+0800\"'
				}
			}
			//console.log(query)
			var GET_body = {
				'app': holiday_appid,
				'query': query
			};
			return kintone.api(kintone.api.url('/k/v1/records', true), 'GET', GET_body).then(function(re) {
				if (re.records.length > 0) {
					event.error = "選擇日期包含假日!"
					return event;
				}
			}).catch(function(resp) {
				// error   
				event.error = resp.message;
				return event;
			});
		}
	})
	//流程管理事件
	kintone.events.on('app.record.detail.process.proceed', async function(event) {
		var record = event.record
		var action = event.action.value
		//console.log(record)
		const body = {
			'app': kintone.app.getId(),
			'id': kintone.app.record.getId()
		};
		let resp = await kintone.api(kintone.api.url('/k/v1/record', true), 'GET', body)
		if (resp.record.狀態.value == "申請中") {
			if(action == "審核完成" || action == "承認"){
			//console.log("start API")
			var apply_name = record["姓名"].value[0].name
			//console.log("申請人:" + apply_name)
			var apply_laborid = record["員工編號"].value
			var apply_leave = record["選擇申請假別"].value
			var apply_start_date = record["請假開始日期"].value
			var apply_end_date = record["請假結束日期"].value
			var apply_start_time = record["選擇請假開始時間"].value
			var apply_end_time = record["選擇請假結束時間"].value
			var apply_days = record["總計申請天數"].value
			var start_d = new Date(apply_start_date)
			var start_d_date = start_d.getDate()
			var start_d_month = start_d.getMonth() + 1
			var end_d = new Date(apply_end_date)
			var end_d_date = end_d.getDate()
			var end_d_month = end_d.getMonth() + 1
			//console.log(start_d_month + "-" + start_d_date + "~" + end_d_month + "-" + end_d_date)
			var this_year = start_d.getFullYear()
			if (start_d_date > 20) {
				var start_m = start_d_month + 1
				if (end_m > 12) {
					var end_m = start_d_month + 1 - 12
				}
			} else {
				var start_m = start_d_month
			}
			if (end_d_date > 20) {
				var end_m = end_d_month + 1
				if (end_m > 12) {
					var end_m = end_d_month + 1 - 12
				}
			} else {
				var end_m = end_d_month
			}
			//----
			var month_report_month = []
			var month_report_year = [this_year]
			var update_date = []
			//生成month_report_year
			var check_range_start = new Date(this_year + "-12-20")
			//var check_range_end = new Date((this_year+1)+"-1-20")
			if (start_d > check_range_start || end_d > check_range_start) {
				var month_len = 12 - start_m + 1 + end_m
				month_report_year.push(this_year + 1) //將隔年加入list
			} else {
				var month_len = end_m - start_m + 1
			}
			//生成month_report_month  list
			for (var i = 0; i < month_len; i++) {
				if (start_m + i > 12) {
					month_report_month.push(start_m + i - 12)
				} else {
					month_report_month.push(start_m + i)
				}
			}
			//生成 update_date
			var currentDate = moment(apply_start_date);
			var stopDate = moment(apply_end_date);
			while (currentDate <= stopDate) {
				update_date.push(moment(currentDate).format('YYYY-MM-DD'))
				currentDate = moment(currentDate).add(1, 'days');
			}
			//console.log(update_date)
			//console.log(month_report_month)//相當於 幾個月的考勤表
			//console.log(month_report_year)
			if (month_report_month.length > 3 && (apply_leave != "出産休暇" || apply_leave != "在宅勤務" || apply_leave != "外勤_国内" ||
					apply_leave != "出張_海外" || apply_leave != "出勤振替")) {
				//error
				Swal.fire({
					icon: 'error',
					title: '選擇請假天數超過規定!',
					text: "請重新選擇!"
				})
			} else {
				var record_list = {
					"姓名": {
						"value": apply_name
					},
					"員工編號": {
						"value": apply_laborid
					},
					"選擇申請假別": {
						"value": apply_leave
					},
					"選擇請假開始日期": {
						"value": apply_start_date
					},
					"選擇請假結束日期": {
						"value": apply_end_date
					},
					"選擇請假開始時間": {
						"value": apply_start_time
					},
					"選擇請假結束時間": {
						"value": apply_end_time
					},
					"總計申請天數": {
						"value": apply_days
					}
				}
				//PUT 考勤表
				try {
					Swal.fire({
						title: "承核中",
						didOpen: () => {
							Swal.showLoading();
						}
					})
					const resp = await async_PUT_month_report(apply_laborid, record_list, update_date, month_report_month,
						month_report_year);
					//console.log(resp);
					if (resp == "GET error") {
						Swal.fire({
							icon: 'error',
							title: '考勤表須新增才可更新紀錄!',
							text: '考勤表須新增才可更新紀錄!'
						});
						event.error = "考勤表須新增才可更新紀錄!";
					} else {
						//console.log("PUT 員工年度紀錄");
						const re = await async_PUT_year_labor_report(apply_laborid, record_list, month_report_year, update_date);
						//console.log(re);
						Swal.fire({
							icon: 'success',
							title: '請假申請完成!',
							showConfirmButton: false,
							timer: 3000
						});
						location.reload();
					}
				} catch (error) {
					console.error(error);
					Swal.fire({
						icon: 'error',
						title: '出現錯誤!',
						text: error.message
					});
				}
			}
		}
		} else if (resp.record.狀態.value == "取消申請中" || resp.record.狀態.value == "取消中") {
			if(action == "取消完成" || action == "取消"){
			var cancel = record["取消申請"].value
			if (cancel == "取消申請") {
				//console.log("start cancel API")
				var apply_name = record["姓名"].value
				var apply_laborid = record["員工編號"].value
				var apply_leave = record["選擇申請假別"].value
				var apply_start_date = record["請假開始日期"].value
				var apply_end_date = record["請假結束日期"].value
				var apply_start_time = record["選擇請假開始時間"].value
				var apply_end_time = record["選擇請假結束時間"].value
				var apply_days = record["總計申請天數"].value
				var start_d = new Date(apply_start_date)
				var start_d_date = start_d.getDate()
				var start_d_month = start_d.getMonth() + 1
				var end_d = new Date(apply_end_date)
				var end_d_date = end_d.getDate()
				var end_d_month = end_d.getMonth() + 1
				//console.log(start_d_month + "-" + start_d_date + "~" + end_d_month + "-" + end_d_date)
				var this_year = start_d.getFullYear()
				if (start_d_date > 20) {
					var start_m = start_d_month + 1
					if (end_m > 12) {
						var end_m = start_d_month + 1 - 12
					}
				} else {
					var start_m = start_d_month
				}
				if (end_d_date > 20) {
					var end_m = end_d_month + 1
					if (end_m > 12) {
						var end_m = end_d_month + 1 - 12
					}
				} else {
					var end_m = end_d_month
				}
				//----
				var month_report_month = []
				var month_report_year = [this_year]
				var update_date = []
				if (end_m < start_m) {
					var month_len = 12 - start_m + 1 + end_m
					month_report_year.push(this_year + 1) //將隔年加入list
				} else {
					var month_len = end_m - start_m + 1
				}
				//生成month_report_month  list
				for (var i = 0; i < month_len; i++) {
					if (start_m + i > 12) {
						month_report_month.push(start_m + i - 12)
					} else {
						month_report_month.push(start_m + i)
					}
				}
				//生成 update_date
				var currentDate = moment(apply_start_date);
				var stopDate = moment(apply_end_date);
				while (currentDate <= stopDate) {
					update_date.push(moment(currentDate).format('YYYY-MM-DD'))
					currentDate = moment(currentDate).add(1, 'days');
				}
				//console.log(update_date)
				//console.log(month_report_month)//相當於 幾個月的考勤表
				if (month_report_month.length > 3) {
					//error
					Swal.fire({
						icon: 'error',
						title: '選擇請假天數超過規定!',
						text: "請重新選擇!"
					})
				} else {
					var record_list = {
						"姓名": {
							"value": apply_name
						},
						"員工編號": {
							"value": apply_laborid
						},
						"選擇申請假別": {
							"value": apply_leave
						},
						"選擇請假開始日期": {
							"value": apply_start_date
						},
						"選擇請假結束日期": {
							"value": apply_end_date
						},
						"選擇請假開始時間": {
							"value": apply_start_time
						},
						"選擇請假結束時間": {
							"value": apply_end_time
						},
						"總計申請天數": {
							"value": apply_days
						}
					}
					//PUT 考勤表
					try {
						Swal.fire({
							title: "承核中",
							didOpen: () => {
								Swal.showLoading();
							}
						})
						const resp = await async_cancel_PUT_month_report(apply_laborid, record_list, update_date, month_report_month,
							month_report_year);
						//console.log(resp);
						if (resp == "GET error") {
							Swal.fire({
								icon: 'error',
								title: '考勤表須新增才可更新紀錄!',
								text: '考勤表須新增才可更新紀錄!'
							});
							event.error = "考勤表須新增才可更新紀錄!";
						} else {
							//console.log("PUT 員工年度紀錄");
							const re = await async_cancel_year_labor_report(apply_laborid, record_list, month_report_year, update_date);
							//console.log(re);
							Swal.fire({
								icon: 'success',
								title: '取消請假申請完成!',
								showConfirmButton: false,
								timer: 3000
							});
							location.reload();
						}
					} catch (error) {
						console.error(error);
						Swal.fire({
							icon: 'error',
							title: '出現錯誤!',
							text: error.message
						});
					}
				}
			}
		}
		} else {
			//console.log(status + "...")
		}
		return event
	})
})()