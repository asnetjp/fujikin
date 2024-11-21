(function() {
	"use strict";
	const eventsubmit = ["app.record.create.submit", "app.record.edit.submit"]
	kintone.events.on(eventsubmit, function(event) {
		var record = event.record;
		let arrival_date = record.到職日.value
		const result1 = calculateAnnualLeave(arrival_date);
		record.開始日期.value = result1.startDate
		record.結束日期.value = result1.endDate
		record.特休天數.value = result1.annualLeaveDays
		console.log(`${result1.startDate} ~ ${result1.endDate} 特休天數：${result1.annualLeaveDays} 天`);
		return event;
	});
	//西元轉民國年
	function calculateAnnualLeave(startDate) {
		const start = new Date(startDate);
		const currentYear = new Date().getFullYear();
		// 計算到職天數（以年為單位）
		const yearsWorked = currentYear - start.getFullYear();
		let annualLeaveDays = 0;
		if (yearsWorked < 1) {
			annualLeaveDays = 3;
		} else if (yearsWorked < 2) {
			annualLeaveDays = 7;
		} else if (yearsWorked < 3) {
			annualLeaveDays = 10;
		} else if (yearsWorked < 5) {
			annualLeaveDays = 14;
		} else if (yearsWorked < 10) {
			annualLeaveDays = 15;
		} else {
			annualLeaveDays = Math.min(30, 15 + (yearsWorked - 9));
		}
		// 計算特休年度的起始日期（今天的年份/到職日的月份/日）
		const annualLeaveStartDate = new Date(currentYear, start.getMonth(), start.getDate());
		// 計算特休年度的結束日期（到職日的前一天）
		const annualLeaveEndDate = new Date(currentYear + 1, start.getMonth(), start.getDate() - 1);
		// 格式化日期為 yyyy-mm-dd
		const format = (date) => {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		};
		return {
			startDate: format(annualLeaveStartDate),
			endDate: format(annualLeaveEndDate),
			annualLeaveDays,
		};
	}
})();