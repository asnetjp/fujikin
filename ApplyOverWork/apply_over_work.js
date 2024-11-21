(function()  {
	'use strict';
	
	/*---------------------------------------------------------------
	<功能簡介>
		主要功能->加班申請
	
	---------------------------------------------------------------*/

	/*---------------------------------------------------------------
	 parameter
	---------------------------------------------------------------*/
	var submit_events = ['app.record.create.submit','app.record.edit.submit'];
	var over_work_appid = 369 //160 超過勤務届
	/*---------------------------------------------------------------
	 function
	---------------------------------------------------------------*/
	//cancel  PUT 加班報表
	function async_cancel_PUT_over_work(record_list){
		//
		return new Promise((resolve, reject) => {
            var apply_name = record_list["姓名"].value
			var apply_laborid = record_list["員工編號"].value
			var apply_choose = record_list["選擇申請項目"].value
			var apply_date = record_list["申請日期"].value
			
			//確認加班報表 年度月份
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

            var GET_body = {
                'app': over_work_appid,
                'query': query
            }
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp){
				var record = resp.records
				console.log(record)
				
				

				if(get_date>20){
					var k = get_date-21
				}else{
					var k = last_month_last_day_QQ-21+get_date
				}

				var over_work_table = record[0]['加班紀錄'].value
				var over_work_id = record[0]['記錄號碼'].value

				if(apply_date==over_work_table[k].value["日期"].value){
					over_work_table[k] = {
						"value":{
							"日期":{
								"value":apply_date
							},
							"星期":{
								"value":get_day
							},
							"開始時間":{
								"value":""
								},
							"結束時間":{
								"value":""
							},
							"時數":{
								"value":0
							},
							"內容":{
								"value":""
							},
							"備註":{
								"value":""
							}
						}
					}
				}
			
				
				//PUT 格式
				var PUT_body = {
					'app':over_work_appid,
					"id":over_work_id,
					'record':{
						"加班紀錄":{
							"value":over_work_table
						}
					}
				}
				
				
				//PUT 加班報表
				
				kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', PUT_body, function(resp) {
					// success
					console.log(resp);
					
					resolve('PUT success')
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
	//PUT 加班報表
	function async_PUT_over_work(record){
		//
		return new Promise((resolve, reject) => {
            
			var apply_name = record["姓名"].value
            var apply_laborid = record["員工編號"].value
            var apply_over_work = record["選擇申請項目"].value
            var apply_date = record["申請日期"].value
            var apply_start_time = record["開始時間"].value
            var apply_end_time = record["結束時間"].value
            var apply_reason = record["事由"].value
            //var apply_description = record["備註"].value

			//確認加班報表 年度月份
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


            var GET_body = {
                'app': over_work_appid,
                'query': query
            }
			kintone.api(kintone.api.url('/k/v1/records'), 'GET', GET_body).then(function(resp){
				console.log(resp)
				var over_work_record = resp.records
				console.log(over_work_record)
				
				var over_work_table = over_work_record[0]['加班紀錄'].value
				var over_work_id = over_work_record[0]['記錄號碼'].value
				var start_time = new Date("2022-01-01T" + apply_start_time)
				var end_time = new Date("2022-01-01T" + apply_end_time)
				var hours = Math.abs(end_time - start_time) / 36e5


				if(get_date>20){
					var k = get_date-21
				}else{
					var k = last_month_last_day_QQ-21+get_date
				}
				
				if(apply_date==over_work_table[k].value["日期"].value){
					over_work_table[k] = {
						"value":{
							"日期":{
								"value":apply_date
							},
							"星期":{
								"value":get_day
							},
							"開始時間":{
								"value":apply_start_time
								},
							"結束時間":{
								"value":apply_end_time
							},
							"時數":{
								"value":hours
							},
							"內容":{
								"value":apply_reason
							}
						}
					}
				}
			
				
				//PUT 格式
				var PUT_body = {
					'app':over_work_appid,
					"id":over_work_id,
					'record':{
						"加班紀錄":{
							"value":over_work_table
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
						title: '加班申請完成!',
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
			kintone.app.record.setFieldShown('取消申請', false);
		}
		
	})
	kintone.events.on('app.record.detail.show', function(event){
        var record = event.record
		var status = record["狀態"].value
		console.log(status)
		if(status=="審核完成"||status=="取消完成" || status=="承認"){
			//
		}else{
			kintone.app.record.setFieldShown('取消申請', false);
		}
	})
	//限制編輯
	kintone.events.on(["app.record.edit.show","app.record.index.edit.show"], function(event){
		var record = event.record
        
		record['員工編號'].disabled = true
		record['選擇申請項目'].disabled = true
        record['申請日期'].disabled = true
		record['開始時間'].disabled = true
		record['結束時間'].disabled = true
		record['事由'].disabled = true
		var status = record["狀態"].value
		console.log(status)
		if(status=="未處理" || status=="未処理"){
			kintone.app.record.setFieldShown('取消申請', false);
			record['員工編號'].disabled = false
			record['選擇申請項目'].disabled = false
			record['申請日期'].disabled = false
			record['開始時間'].disabled = false
			record['結束時間'].disabled = false
			record['事由'].disabled = false
		}else if(status=="申請中"){
			kintone.app.record.setFieldShown('取消申請', false);
		}else{}

        return event
	})
	//新增紀錄事件
	kintone.events.on(submit_events, function(event){
		var record = event.record
		var apply_name = record["姓名"].value
		var record_start_time = record["開始時間"].value
		var record_end_time = record["結束時間"].value
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
		if(hours%0.5!==0){
			event.error = "請確認申請時數(須以0.5小時為單位)"
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
            //PUT 加班報表
            async_PUT_over_work(record).then(resp => {
                //
                console.log(resp)
            })
        }else if(status=="未處理" || status=="未処理"){
            console.log("呈核ing...")
        }else if(action=="取消完成"){
			var cancel = record["取消申請"].value
            if(cancel=="取消申請"){
				console.log("start cancel API")

				var apply_name = record["姓名"].value
				var apply_laborid = record["員工編號"].value
				var apply_choose = record["選擇申請項目"].value
				var apply_date = record["申請日期"].value
				var apply_description = record["事由"].value
				var record_list = {
					"姓名":{
						"value":apply_name
					},
					"員工編號":{
						"value":apply_laborid
					},
					"選擇申請項目":{
						"value":apply_choose
					},
					"申請日期":{
						"value":apply_date
					},
					"事由":{
						"value":apply_description
					}
				}
					//PUT 加班報表
					async_cancel_PUT_over_work(record_list).then(
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
								
								//PUT 員工年度紀錄
								Swal.fire({
									icon: 'success',
									title: '加班取消完成!',
									showConfirmButton: false,
									timer: 3000
								  }).then(
									location.reload()
								  )
							}
						}
					)
				
			}
		}else{
            console.log("...")
        }
		return event
    })
})()




						