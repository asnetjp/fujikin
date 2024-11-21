
(function()  {
	'use strict';
	
    /*---------------------------------------------------------------
	 parameter
	---------------------------------------------------------------*/
	

	/*---------------------------------------------------------------
	 function
	---------------------------------------------------------------*/
	
    
    /*---------------------------------------------------------------
	 event
	---------------------------------------------------------------*/
	kintone.events.on('app.record.index.show', function(event){
        var record = event.record
        
        //字体颜色的设定值
        var fontColorRed = "#ff0000";
        var el_name = kintone.app.getFieldElements('姓名');    //備註
        var el_laborid = kintone.app.getFieldElements('員工編號');
        var el_appartment = kintone.app.getFieldElements('部門');
        var el_clockindate = kintone.app.getFieldElements('打卡日期');
        var el_startwork = kintone.app.getFieldElements('上班時間');
        var el_endwork = kintone.app.getFieldElements('下班時間');
        var el_worktime = kintone.app.getFieldElements('工時');
        var el_real_worktime = kintone.app.getFieldElements('實際工時');
        var elCustomer = kintone.app.getFieldElements('備註');


        for (var i = 0; i < 300; i++) {
            var record = event.records[i];
            
            try{
                //
                if (record['備註']['value'] == "打卡時數低於規定" || record['備註']['value'] == "未打卡") {
                    el_name[i].style.color = fontColorRed;
                    el_laborid[i].style.color = fontColorRed;
                    el_appartment[i].style.color = fontColorRed;
                    el_clockindate[i].style.color = fontColorRed;
                    el_startwork[i].style.color = fontColorRed;
                    el_endwork[i].style.color = fontColorRed;
                    el_worktime[i].style.color = fontColorRed;
                    el_real_worktime[i].style.color = fontColorRed;
                    elCustomer[i].style.color = fontColorRed;
                }
            }catch(error){
                console.log(error)
            }
            
        }
        return event
    })
})()


