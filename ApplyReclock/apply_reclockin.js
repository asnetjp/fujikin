(function()  {
	'use strict';
	
	/*---------------------------------------------------------------
	<功能簡介>
		主要功能->補打卡申請
	
	---------------------------------------------------------------*/

	/*---------------------------------------------------------------
	 parameter
	---------------------------------------------------------------*/
	var submit_events = ['app.record.create.submit','app.record.edit.submit'];
	var month_report_appid = 367 //144 考勤表
	/*---------------------------------------------------------------
	 function
	---------------------------------------------------------------*/
	//cancel  PUT 考勤表
	//PUT 考勤表
	function async_cancel_PUT_month_report(apply_laborid, record_list, update_date, month_report_month, month_report_year){
		//
		return new Promise((resolve, reject) => {
            
			//query 生成
			
			var query = '年度=\"' + month_report_year[0] + '\" and 月份=\"'+month_report_month[0]+'\"' + 'and 員工編號=\"'+ apply_laborid + '\"'
			


            var GET_body = {
                'app': month_report_appid,
                'query': query
            }
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp){
				var record = resp.records
				console.log(record)
				
				//取得符合月份的紀錄
				var PUT_array = []
				 
				var record_name = record_list['姓名'].value
				var record_choose_leave = record_list['選擇申請項目'].value
				var record_date = record_list['申請日期'].value
				var apply_start_time = record_list['上班時間'].value
				var apply_end_time = record_list['下班時間'].value
				var month_report_relockin = record[0][record_choose_leave].value //更新補打卡欄位
				var start_time = new Date("2022-01-01T" + apply_start_time)
				var end_time = new Date("2022-01-01T" + apply_end_time)
				var hours = Math.abs(end_time - start_time) / 36e5
				//更新補打卡欄位0.5或1天
				if(hours>=8){
					var update_reclockin = Number(month_report_relockin)-1
				}else{
					var update_reclockin = Number(month_report_relockin)-0.5
				}
				console.log("本次取消:"+record_choose_leave+record_date+"共"+update_reclockin+"天")
				//考勤表紀錄
				
				for(var i=0;i<record.length;i++){
					
					var month_report_year = record[i]['年度'].value
					var month_report_month_LOOP = record[i]['月份'].value
					//var month_report_labor = record[i]['姓名'].value
					var month_report_laborID = record[i]['員工編號'].value
					var month_report_table = record[i]['出缺勤紀錄'].value
					
					var month_report_record_id = record[i]['記錄號碼'].value
					//update_date LOOP
					for(var j=0;j<update_date.length;j++){
						if(month_report_month_LOOP==1){
							var month = 12
						}else{
							var month = month_report_month_LOOP-1
						}
						var last_month_last_day = new Date(month_report_year, month, 0).getDate()
						var last_month_last_day_QQ = Number(last_month_last_day)
						var date = new Date(update_date[j]).getDate()
						var date_QQ = Number(date)
						
						//檢查日期 屬於哪個月考勤表
						if(date_QQ>20){
							var check_month = new Date(update_date[j]).getMonth()+2//即為下個月的考勤表
							if(check_month>12){
								var check_month = 1
							}
						}else{
							var check_month = new Date(update_date[j]).getMonth()+1
						}
						
						if(month_report_laborID==apply_laborid && check_month==month_report_month_LOOP){//名字+月份正確
							if(date_QQ>20){
								var k = date_QQ-21
							}else{
								var k = last_month_last_day_QQ-21+date_QQ
							}
							var des = month_report_table[k].value["備註"].value
							var json = JSON.parse(month_report_table[k].value["備註code"].value)
							if(json["休暇"]!=""){
								json["休暇"] = json["休暇"]
								json["補打卡"] = ""
							}else{
								json["休暇"] = ""
								json["補打卡"] = ""
							}
							var str_json = JSON.stringify(json)
							
							//更新表格紀錄
							
							var day_list = ['日', '一', '二', '三', '四', '五', '六'];
							var date = new Date(record_date)
							var day = date.getDay()
							var get_day = day_list[day]
							//計算工時  2023/07/18新增
							var start_time = new Date("2022-01-01T" + month_report_table[k].value['上班時間'].value)
							var end_time = new Date("2022-01-01T" + month_report_table[k].value['下班時間'].value)
							var hours = Math.abs(end_time - start_time) / 36e5 //36e5 is the scientific notation for 60*60*1000
							var lunch_break = 0.75
							console.log("it is hours:" + hours)
							if((hours-lunch_break)>=8){
								month_report_table[k].value['工時'].value = 8
								month_report_table[k].value['實際工時'].value = hours-lunch_break
								var cancel_description = ""
							}else if((hours-lunch_break)>=4 && (hours-lunch_break)<8){
								month_report_table[k].value['工時'].value = 4
								var cancel_description = ""
								month_report_table[k].value['實際工時'].value = hours-lunch_break
							}else if(parseInt(hours)==4){
								month_report_table[k].value['工時'].value = 4
								var cancel_description = ""
								month_report_table[k].value['實際工時'].value = hours
							}else{
								var cancel_description = ""
								month_report_table[k].value['工時'].value = isNaN(hours) ? 0 : hours;
								month_report_table[k].value['實際工時'].value = hours
							}

							month_report_table[k] = {
								"value":{
									"日期":{
										"value":record_date
									},
									"星期":{
										"value":get_day
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
										"value": cancel_description+json["休暇"]+json["補打卡"]
									},
									"備註code":{
										"value":str_json
									}
								}
							}
						}
					}
					var re = {
						"id":month_report_record_id,
						"record":{
							[record_choose_leave]:{
								"value":update_reclockin
							},
							"出缺勤紀錄":{
								"value":month_report_table
							}
						}
					}
					PUT_array.push(re)
						
				}	
				
				//PUT 格式
				var PUT_body = {
					'app':month_report_appid,
					'records':PUT_array
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
				
			}).catch(function(err){
				//error
				//reject(err)
				console.log(err)
			})
        })
	}
	
	//PUT 考勤表
	function async_PUT_month_report(record){
		//
		return new Promise((resolve, reject) => {
            
			//var apply_name = record["姓名"].value
      var apply_laborid = record["員工編號"].value
      var apply_reclockin = record["選擇申請項目"].value
			//補打卡翻譯
			if(apply_reclockin=="打刻忘れ"){
				var apply_reclockin = "忘記打卡"
			}
			if(apply_reclockin=="直行直帰"){
				var apply_reclockin = "直行直歸"
			}
            var apply_date = record["申請日期"].value
            var apply_start_time = record["上班時間"].value
            var apply_end_time = record["下班時間"].value
            //var apply_reason = record["事由"].value
            //var apply_description = record["備註"].value

			//確認報表 年度月份
			
			var day_list = ['日', '一', '二', '三', '四', '五', '六'];
			var date = new Date(apply_date)
			var day = date.getDay()
			var get_day = day_list[day]
			
			var str = apply_date.toString()
			var ls = str.split("-")
			var get_year = Number(ls[0])
			var get_month = Number(ls[1])
			var get_date = Number(ls[2])
			var last_month_last_day = new Date(get_year, get_month-1, 0).getDate()
			var last_month_last_day_QQ = Number(last_month_last_day)

			if(get_date>20){
				if(get_month==12){
					var apply_month = 1
					var apply_year = get_year+1
				}else{
					var apply_month = get_month+1
					var apply_year = get_year
				}
			}else{
				var apply_month = get_month
				var apply_year = get_year
			}
			//query 生成
			var query = '年度=\"' + apply_year + '\" and 月份=\"' + apply_month + '\" and 員工編號=\"'+ apply_laborid + '\"'
			console.log(query)
            var GET_body = {
                'app': month_report_appid,
                'query': query
            }
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp){
				
				var month_report_record = resp.records
				console.log(month_report_record)
				var month_report_table = month_report_record[0]['出缺勤紀錄'].value
				var month_report_id = month_report_record[0]['記錄號碼'].value
				
				console.log("選項:"+apply_reclockin)
				var month_report_relockin = month_report_record[0][apply_reclockin].value //更新補打卡欄位
				var start_time = new Date("2022-01-01T" + apply_start_time)
				var end_time = new Date("2022-01-01T" + apply_end_time)
				var hours = Math.abs(end_time - start_time) / 36e5

				if(get_date>20){
					var k = get_date-21
				}else{
					var k = last_month_last_day_QQ-21+get_date
				}
				//備註code
				var json = JSON.parse(month_report_table[k].value["備註code"].value)
				var str_json = JSON.stringify(json)

				//計算工時  2023/07/18新增
				var start_time = new Date("2022-01-01T" + record["上班時間"].value)
				var end_time = new Date("2022-01-01T" + record["下班時間"].value)
				var hours = Math.abs(end_time - start_time) / 36e5 //36e5 is the scientific notation for 60*60*1000
				var lunch_break = 0.75
				if((hours-lunch_break)>=8){
					month_report_table[k].value['工時'].value = 8
					month_report_table[k].value['實際工時'].value = hours-lunch_break
				}else if((hours-lunch_break)>=4 && (hours-lunch_break)<8){
					month_report_table[k].value['工時'].value = 4
					month_report_table[k].value['實際工時'].value = hours-lunch_break
				}else if(parseInt(hours)==4){
					month_report_table[k].value['工時'].value = 4
					month_report_table[k].value['實際工時'].value = hours
				}else{
					month_report_table[k].value['工時'].value = hours
					month_report_table[k].value['實際工時'].value = hours
				}

				//更新補打卡欄位0.5或1天
				//20230705新增 忘記打卡改為次數
				if(apply_reclockin=="忘記打卡"){
					var update_reclockin = Number(month_report_relockin)+1
					console.log("本次新增:"+apply_reclockin+apply_date+"共"+update_reclockin+"次")
				}
				if(apply_reclockin=="直行直歸"){
					if(hours>=8){
						var update_reclockin = Number(month_report_relockin)+1
					}else{
						var update_reclockin = Number(month_report_relockin)+0.5
					}
					console.log("本次新增:"+apply_reclockin+apply_date+"共"+update_reclockin+"天")
				}
				/*
				if(hours>=8){
					var update_reclockin = Number(month_report_relockin)+1
				}else{
					var update_reclockin = Number(month_report_relockin)+0.5
				}
				console.log("本次新增:"+apply_reclockin+apply_date+"共"+update_reclockin+"天")*/
				//修改備註code
				apply_start_time = apply_start_time.replace(/^0+/, '');
				if(json["休暇"]==""){
					json["休暇"] = ""
					json["補打卡"] = apply_reclockin+apply_start_time+"~"+apply_end_time
				}else{
					json["休暇"] = json["休暇"]
					json["補打卡"] = ","+apply_reclockin+apply_start_time+"~"+apply_end_time
				}
				var str_json = JSON.stringify(json)
				if(apply_date==month_report_table[k].value["日期"].value){
					/*if(hours<8.75 && hours>=4){ //補打卡半天 hours是申請時間計算的時數
						console.log(month_report_table[k].value["上班時間"].value)
						//if(month_report_table[k].value["上班時間"].value==null){
						//	var start_t = apply_start_time
						//	var end_t = apply_end_time
						//}else{
						//	var start_t = month_report_table[k].value["上班時間"].value
						//	var end_t = month_report_table[k].value["下班時間"].value
						//}
						if(month_report_table[k].value["實際工時"].value ==4){//正常打卡 有打卡紀錄
							var start_t = month_report_table[k].value["上班時間"].value
							var end_t = month_report_table[k].value["下班時間"].value
						}else if(month_report_table[k].value["上班時間"].value==null || month_report_table[k].value["下班時間"].value==null){ //異常打卡 覆蓋錯的打卡
							var start_t = apply_start_time
							var end_t = apply_end_time
						}else{
							var start_t = apply_start_time
							var end_t = apply_end_time
						}
						//半天
						month_report_table[k] = {
							"value":{
								"日期":{
									"value":apply_date
								},
								"星期":{
									"value":get_day
								},
								"上班時間":{
									"value":start_t
								},
								"下班時間":{
									"value":end_t
								},
								"工時":{
									"value":4
								},
								"實際工時":{
									"value":4
								},
								"備註":{
									"value":json["休暇"]+json["補打卡"]
								},
								"備註code":{
									"value":str_json
								}
							}
						}
					}else{
						month_report_table[k] = {
							"value":{
								"日期":{
									"value":apply_date
								},
								"星期":{
									"value":get_day
								},
								"上班時間":{
									"value":apply_start_time
								},
								"下班時間":{
									"value":apply_end_time
								},
								"工時":{
									"value":8
								},
								"實際工時":{
									"value":8
								},
								"備註":{
									"value":json["休暇"]+json["補打卡"]
								},
								"備註code":{
									"value":str_json
								}
							}
						}
					}*/
					month_report_table[k] = {
						"value":{
							"日期":{
								"value":apply_date
							},
							"星期":{
								"value":get_day
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
								"value":json["休暇"]+json["補打卡"]
							},
							"備註code":{
								"value":str_json
							}
						}
					}
				}
			
				
				//PUT 格式
				var PUT_body = {
					'app':month_report_appid,
					"id":month_report_id,
					'record':{
						[apply_reclockin]:{
							"value":update_reclockin
						},
						"出缺勤紀錄":{
							"value":month_report_table
						}
					}
				}
				
				//PUT 加班申請表
				
				kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', PUT_body, function(resp) {
					// success
					console.log(resp);
					resolve('PUT success')
					Swal.fire({
						icon: 'success',
						title: '補打卡申請完成!',
						showConfirmButton: false,
						timer: 3000
					  }).then(
						location.reload()
					  )
				}, function(error) {
					// error
					console.log(error);
				});
				
			}).catch(function(err){
				//error
				reject(err)
			})
        })
	}
    /*---------------------------------------------------------------
	 event
	---------------------------------------------------------------*/
	// 取消欄位的顯示與隱藏
	kintone.events.on(['app.record.detail.show','app.record.create.show'], function(event){
        var record = event.record
		
		
		if("狀態" in record){
			console.log(status)
			var status = record["狀態"].value
		}else{
			var status = "create"
		}
		
		
		if(status=="審核完成"||status=="取消完成" || status=="承認"){
			//
		}else{
			// kintone.app.record.setFieldShown('取消申請', false);
		}
		
	})
	kintone.events.on('app.record.detail.show', function(event){
        var record = event.record
		var status = record["狀態"].value
		console.log(status)
		if(status=="審核完成"||status=="取消完成" || status=="承認"){
			//
		}else{
			// kintone.app.record.setFieldShown('取消申請', false);
		}
	})
	//限制編輯
	kintone.events.on(["app.record.edit.show","app.record.index.edit.show"], function(event){
		var record = event.record
        
		record['員工編號'].disabled = true
		record['申請日期'].disabled = true
		record['下班時間'].disabled = true
		record['上班時間'].disabled = true
		record['選擇申請項目'].disabled = true
		var status = record["狀態"].value
		console.log(status)
		if(status=="未處理"||status=="申請中" || status=="未処理"){
			// kintone.app.record.setFieldShown('取消申請', false);
		}
        return event
	})
	//新增紀錄事件
	kintone.events.on(['app.record.create.submit','app.record.edit.submit'], function(event){
		var record = event.record
		var record_start_time = record["上班時間"].value
		var record_end_time = record["下班時間"].value
		var apply_name = record["姓名"].value
		var apply_laborID = record["員工編號"].value
		var start_time = new Date("2022-01-01T" + record_start_time)
		var end_time = new Date("2022-01-01T" + record_end_time)
		var hours = Math.abs(end_time - start_time) / 36e5
		var apply_boss = record["呈核主管"].value
		//FTI009權限限制
		var user = kintone.getLoginUser();
		console.log(user);
		if(apply_laborID!=="009" && user["code"]=="FTI009"){
			event.error = "選擇錯誤, 您只能幫自己請假!"
			return event
		}
		//禁止呈核自己
		console.log(apply_boss)
		/*if(user["code"]!=="FTI051"){
			for(var i=0;i<apply_boss.length;i++){
				if(apply_boss[i]["code"]==user["code"]){
					console.log(apply_boss[i]["code"])
					event.error = "選擇錯誤, 您不能呈核給自己!"
					return event
				}
			}
		}*/
		if(hours<4){
			event.error = "請確認申請時數(僅限4小時或8小時)"
		}
		
		return event
	})
	//流程管理事件
    kintone.events.on('app.record.detail.process.proceed', function(event){
        
        var record = event.record
        console.log(record["狀態"].value)
        var status = record["狀態"].value
		var action = event.action.value
        if(action=="審核完成" || action=="承認"){
            console.log("start API")
            //PUT 考勤表
            async_PUT_month_report(record).then(resp => {
                //
                console.log(resp)
            })
        }else if(status=="未處理" || status=="未処理"){
            //console.log("呈核ing...")
        }else if(action=="取消完成"){
			var cancel = record["取消申請"].value
            if(cancel=="取消申請"){
				//console.log("start cancel API")

				var apply_name = record["姓名"].value
				var apply_laborid = record["員工編號"].value
				var apply_project = record["選擇申請項目"].value
				var apply_date = record["申請日期"].value
				var apply_start_time = record["上班時間"].value
				var apply_end_time = record["下班時間"].value
				var start_d = new Date(apply_date)
				var start_d_date = start_d.getDate()
				var start_d_month = start_d.getMonth()+1
				
				console.log(start_d_month+"-"+start_d_date)
				var this_year = start_d.getFullYear()
				if(start_d_date>20){
					var start_m = start_d_month+1
					if(end_m>12){
						var end_m = start_d_month+1-12
					}
				}else{
					var start_m = start_d_month
				}
				
				
				var month_len = 1
				var month_report_month = []
				var month_report_year = [this_year]
				//生成month_report_month  list
				for(var i =0;i<month_len;i++){
					if(start_m+i>12){
						month_report_month.push(start_m+i-12)
					}else{
						month_report_month.push(start_m+i)
					}
				}
				//生成 update_date
				
				var update_date = [start_d]
				
				console.log(update_date)
				console.log(month_report_month)//相當於 幾個月的考勤表
				if(month_report_month.length>3){
					//error
					Swal.fire({
						icon: 'error',
						title: '選擇時數超過規定!'
					})
				}else{
					var record_list = {
						"姓名":{
							"value":apply_name
						},
						"員工編號":{
							"value":apply_laborid
						},
						"上班時間":{
							"value":apply_start_time
						},
						"下班時間":{
							"value":apply_end_time
						},
						"選擇申請項目":{
							"value":apply_project
						},
						"申請日期":{
							"value":apply_date
						}
					}
					//PUT 考勤表
					async_cancel_PUT_month_report(apply_laborid, record_list, update_date, month_report_month, month_report_year).then(
						resp => {
							console.log(resp)
							if(resp=="GET error"){
								//error
								Swal.fire({
									icon: 'error',
									title: '考勤表須新增才可更新紀錄!',
									text: '考勤表須新增才可更新紀錄!'
								})
								event.error = "考勤表須新增才可更新紀錄!"
							}else{
								Swal.fire({
									icon: 'success',
									title: '取消補打卡完成!',
									showConfirmButton: false,
									timer: 3000
								}).then(
									location.reload()
								)
							}
						}
					)
				}
			}
		}else{
            console.log("...")
        }
		return event
    })
})()




						