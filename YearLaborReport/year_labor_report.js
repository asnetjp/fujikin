
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
    kintone.events.on('app.record.detail.show', function(event){
        var record = event.record
        
        //隱藏欄位
        kintone.app.record.setFieldShown('記錄號碼', false);
        kintone.app.record.setFieldShown('code', false);
        kintone.app.record.setFieldShown('KEY_系統用_', false);
        kintone.app.record.setFieldShown('日期_系統用_', false);

        return event
    })
	//創建後 限制修改日期,星期
    kintone.events.on('app.record.edit.show', function(event){
        var record = event.record
        
            record['姓名'].disabled = true
            record['年度'].disabled = true
            record['部門'].disabled = true
            record['code'].disabled = true
            record['員工編號'].disabled = true
            record['KEY_系統用_'].disabled = true
            record['日期_系統用_'].disabled = true
            
        return event
    })
})()


