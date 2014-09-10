//スケジュールの各値がnullの時の代替値;
var SubstituteSchedule = {
	title: 'No title',
	name: '未定',
	detail: '',
	backColor: '#fdf7e2',
	fontColor: '#6d5450',
	lineColor: '#6d5450',
	startPointHour: null,
	startPointMinute: null,
};

var Handler = (function() {
	var Handler = function(target) {
		/*
		IEは対応していない;
		if(!(target instanceof EventTarget)) {
			throw new TypeError();
		}
		*/
		var events = [];

		this.key = null;
		this.getEvents = function() {
			return clone(events);
		};
		this.addListener = function(type, listener, capture) {
			target.addEventListener(type, listener, capture);
			this.key = events.length;
			events[events.length] = {
				target: target,
				type: type,
				listener: listener,
				capture: capture,
			};

			return this.key;
		};
		this.removeListener = function(key) {
			if(key in events) {
				var e = events[key];
				e.target.removeEventListener(e.type, e.listener, e.capture);
				events.splice(key, 1);
			}
		};

		//登録したイベント全て消す;
		this.removeAllListener = function() {
			while(events.length > 0){
				this.removeListener(0);
			}
			this.key = null;
		};
	};

	return Handler;
})();


var SchedulingForm = (function() {
	var SchedulingForm = function() {
		Object.defineProperties(this, {
			historyManager: {value: new HistoryManager()},
			title: {value: new ScheduleTitle()},
			lineColor: {value: new ScheduleLineColor()},
			addButton: {value: new AddButton()},
			undoButton: {value: new UndoButton()},
			redoButton: {value: new RedoButton()},
			saveButton: {value: new SaveButton()},
			overwriteButton: {value: new OverwriteButton()},
			resetButton: {value: new ResetButton()},
			allRemoveButton: {value: new AllRemoveButton()},
			allRestoreButton: {value: new AllRestoreButton()},
			startPoint: {value: new ScheduleStartPoint()},
			imageDownloadButton: {value: new ImageDownloadButton()},
		});

		SchedulingForm.init();
		this.historyManager.add(SchedulingForm.getValue());
	};

	SchedulingForm.prototype.undo = function() {
		if(!this.historyManager.undoes()) {
			return;
		}
		SchedulingForm.setValue(this.historyManager.undo());
	};

	SchedulingForm.prototype.redo = function() {
		if(!this.historyManager.redoes()) {
			return;
		}
		SchedulingForm.setValue(this.historyManager.redo());
	};

	SchedulingForm.prototype.setEventListener = function(scheduler) {
		if(!(scheduler instanceof Scheduler)) {
			throw new TypeError();
		}

		this.title.addChangeListener(function() {
			scheduler.setTitle(new ScheduleTitle());
			new ScheduleDisplay(scheduler.getDaySchedule()).changeTitle();
		});
		eventController.push(this.title);

		this.lineColor.addChangeListener(function() {
			scheduler.setLineColor(new ScheduleLineColor());
			new ScheduleDisplay(scheduler.getDaySchedule()).changeLineColor();
		});
		eventController.push(this.lineColor);

		this.startPoint.addChangeListener(function() {
			scheduler.setStartPoint(new ScheduleStartPoint());
			new ScheduleDisplay(scheduler.getDaySchedule()).changeStartPoint();
		});
		eventController.push(this.startPoint);

		this.addButton.addClickListener(function() {
			scheduler.add(new SchedulingData());
			new ScheduleDisplay(scheduler.getDaySchedule()).displaySchedule();
			this.historyManager.add(SchedulingForm.getValue());
		}.bind(this));
		eventController.push(this.addButton);


		this.undoButton.addClickListener(function() {
			scheduler.undo();
			new ScheduleDisplay(scheduler.getDaySchedule()).displaySchedule();
			this.undo();
		}.bind(this));
		eventController.push(this.undoButton);

		this.redoButton.addClickListener(function() {
			scheduler.redo();
			new ScheduleDisplay(scheduler.getDaySchedule()).displaySchedule();
			this.redo();
		}.bind(this));
		eventController.push(this.redoButton);

		this.saveButton.addClickListener(function() {
			var saver = new ScheduleSaver(scheduler.getDaySchedule());
			var key = saver.add();
			new StorageDisplay().add(key);
		});
		eventController.push(this.saveButton);

		this.overwriteButton.addClickListener(function() {
			var saver = new ScheduleSaver(scheduler.getDaySchedule());
			var key = saver.overwrite();
			new StorageDisplay().overwrite(key);
		});
		eventController.push(this.overwriteButton);

		this.resetButton.addClickListener(function() {
			SchedulingForm.setDefaultValue();
			this.historyManager.add(SchedulingForm.getValue());

			scheduler.init();
			var scheduleDisplay = new ScheduleDisplay(scheduler.getDaySchedule());
			scheduleDisplay.displaySchedule();
			scheduleDisplay.changeTitle();
		}.bind(this));
		eventController.push(this.resetButton);

		this.allRemoveButton.addClickListener(function() {
			new StorageDisplay().allRemove();
			SchedulingForm.allRemoveButton.classList.add('display-none');
			SchedulingForm.allRestoreButton.classList.remove('display-none');
		});
		eventController.push(this.allRemoveButton);

		this.allRestoreButton.addClickListener(function() {
			new StorageDisplay().allUndo();
			SchedulingForm.allRemoveButton.classList.remove('display-none');
			SchedulingForm.allRestoreButton.classList.add('display-none');
		});
		eventController.push(this.allRestoreButton);

		this.imageDownloadButton.addClickListener(function() {
			var scheduleAnalyst = new ScheduleExcludingDetailAnalyst(scheduler.getDaySchedule());
			var canvasDrawer = new MainScheduleCanvasDrawer(scheduleAnalyst.shaping());
			canvasDrawer.draw();
			var canvasDownloader = new CanvasDownloader(canvasDrawer.getCanvas());
			canvasDownloader.download();
		});
		eventController.push(this.imageDownloadButton);

	};

	SchedulingForm.prototype.removeEventListener = function() {};


	SchedulingForm.getValue = function() {
		return {
			title: SchedulingForm.title.value,
			name: SchedulingForm.scheduleName.value,
			detail: SchedulingForm.detail.value,
			startHour: SchedulingForm.startHour.value,
			startMinute: SchedulingForm.startMinute.value,
			finishHour: SchedulingForm.finishHour.value,
			finishMinute: SchedulingForm.finishMinute.value,
			backColor: SchedulingForm.backColor.value,
			fontColor: SchedulingForm.fontColor.value,
			lineColor: SchedulingForm.lineColor.value,
			startPointHour: SchedulingForm.startPointHour.value,
			startPointMinute: SchedulingForm.startPointMinute.value,
		};
	};

	//title lineColorとstartPointを除く;
	SchedulingForm.setValue = function(value) {
		SchedulingForm.scheduleName.value = value.name;
		SchedulingForm.detail.value = value.detail;
		SchedulingForm.startHour.value = value.startHour;
		SchedulingForm.startMinute.value = value.startMinute;
		SchedulingForm.finishHour.value = value.finishHour;
		SchedulingForm.finishMinute.value = value.finishMinute;
		SchedulingForm.backColor.value = value.backColor;
		SchedulingForm.fontColor.value = value.fontColor;
	};
	SchedulingForm.setDefaultValue = function() {
		SchedulingForm.title.value = '';
		SchedulingForm.scheduleName.value = '';
		SchedulingForm.detail.value = '';
		SchedulingForm.startHour.value = '0';
		SchedulingForm.startMinute.value = '0';
		SchedulingForm.finishHour.value = '0';
		SchedulingForm.finishMinute.value = '0';
		SchedulingForm.backColor.value = SubstituteSchedule.backColor;
		SchedulingForm.fontColor.value = SubstituteSchedule.fontColor;
		SchedulingForm.lineColor.value = SubstituteSchedule.lineColor;
		SchedulingForm.startPointHour.value = null;
		SchedulingForm.startPointMinute.value = null;
	};
	SchedulingForm.init = function() {
		eventController.removeEvents();
		SchedulingForm.setDefaultValue();
		SchedulingForm.allRemoveButton.classList.remove('display-none');
		SchedulingForm.allRestoreButton.classList.add('display-none');
	};
	SchedulingForm.setStartPoint = function(time) {
		SchedulingForm.startPointHour.value = time.hour;
		SchedulingForm.startPointMinute.value = time.minute;
	};

	var eventController = new Object();
	eventController.events = [];
	eventController.push = function(handler) {
		if(!('removeAllListener' in handler)) {
			throw new TypeError();
		}
		this.events.push(handler);
	};
	eventController.removeEvents = function() {
		for(var i = 0; i < this.events.length; i++) {
			this.events[i].removeAllListener();
		}
		this.events = [];
	};


	//SchedulingFormのDOM;
	var interface = document.getElementById('interface');
	var form = interface.querySelector('.scheduling-form')
	var scheduleTitle = form.querySelector('.schedule-title');
	var title = scheduleTitle.querySelector('input[name="title"]');
	var content = form.querySelector('.schedule-content');
	var time = form.querySelector('.schedule-time');
	var color = form.querySelector('.schedule-color');
	var schedulingButton = form.querySelector('.scheduling-button');
	var name = content.querySelector('input[name="name"]');
	var detail = content.querySelector('textarea[name="detail"]');
	var start = time.querySelector('.start');
	var finish = time.querySelector('.finish');
	var startHour = start.querySelector('input[name="hour"]');
	var startMinute = start.querySelector('input[name="minute"]');
	var finishHour = finish.querySelector('input[name="hour"]');
	var finishMinute = finish.querySelector('input[name="minute"]');
	var backColor = color.querySelector('input[name="back-color"]');
	var fontColor = color.querySelector('input[name="font-color"]');
	var lineColor = color.querySelector('input[name="line-color"]');
	var undoButton = schedulingButton.querySelector('input[name="undo"]');
	var redoButton = schedulingButton.querySelector('input[name="redo"]');
	var addButton = schedulingButton.querySelector('input[name="add"]');
	var saveButton = schedulingButton.querySelector('input[name="save"]');
	var overwriteButton = schedulingButton.querySelector('input[name="overwrite"]');
	var resetButton = schedulingButton.querySelector('input[name="reset"]');
	var allRemoveButton = schedulingButton.querySelector('input[name="all-remove"]');
	var allRestoreButton = schedulingButton.querySelector('input[name="all-restore"]');
	var startPoint = document.querySelector('.start-point');
	var startPointHour = startPoint.querySelector('input[name="hour"]');
	var startPointMinute = startPoint.querySelector('input[name="minute"]');
	var imageDownloadButton = document.querySelector('.download input[name="image"]');

	Object.defineProperties(SchedulingForm, {
		title: {value: title},
		scheduleName: {value: name}, //nameだとFunction.nameと被る;
		detail: {value: detail},
		startHour: {value: startHour},
		startMinute: {value: startMinute},
		finishHour: {value: finishHour},
		finishMinute: {value: finishMinute},
		backColor: {value: backColor},
		fontColor: {value: fontColor},
		lineColor: {value: lineColor},
		undoButton: {value: undoButton},
		redoButton: {value: redoButton},
		addButton: {value: addButton},
		saveButton: {value: saveButton},
		overwriteButton: {value: overwriteButton},
		resetButton: {value: resetButton},
		allRemoveButton: {value: allRemoveButton},
		allRestoreButton: {value: allRestoreButton},
		startPointHour: {value: startPointHour},
		startPointMinute: {value: startPointMinute},
		imageDownloadButton: {value: imageDownloadButton},
	});

	return SchedulingForm;
})();


var ScheduleDisplay = (function() {
	var ScheduleDisplay = function(daySchedule) {
		if(!Scheduler.isDaySchedule(daySchedule)) {
			throw new TypeError();
		}

		Object.defineProperties(this, {
			daySchedule: {value: daySchedule},
		});
	};

	ScheduleDisplay.prototype.displaySchedule = function() {
		var scheduleExcludingDetailAnalyst = new ScheduleExcludingDetailAnalyst(this.daySchedule);
		var mainScheduleDrawer = new MainScheduleDrawer(scheduleExcludingDetailAnalyst.shaping());
		var scheduleStrictAnalyst = new ScheduleStrictAnalyst(this.daySchedule);
		var scheduleWriter = new ScheduleWriter(scheduleStrictAnalyst.shaping());

		mainScheduleDrawer.draw();
		scheduleWriter.write();
	};

	ScheduleDisplay.prototype.changeTitle = function() {
		var scheduleAnalyst = new ScheduleStrictAnalyst(this.daySchedule);
		var scheduleTitleWriter = new ScheduleTitleWriter(scheduleAnalyst.shapingBriefly());
		scheduleTitleWriter.write();
	};

	ScheduleDisplay.prototype.changeLineColor = function() {
		var scheduleAnalyst = new ScheduleExcludingDetailAnalyst(this.daySchedule);
		var mainScheduleDrawer = new MainScheduleDrawer(scheduleAnalyst.shapingBriefly());
		mainScheduleDrawer.paintLineColor();
	};

	ScheduleDisplay.prototype.changeStartPoint = function() {
		var scheduleAnalyst = new ScheduleStrictAnalyst(this.daySchedule);
		var scheduleWriter = new ScheduleWriter(scheduleAnalyst.shaping());
		scheduleWriter.write();
	};

	var scheduleDisplayArea = document.getElementById('schedule-display-area');
	var title = scheduleDisplayArea.querySelector('.article-title');
	var pieChart = scheduleDisplayArea.querySelector('.pie-chart');
	var writing = scheduleDisplayArea.querySelector('.writing');
	Object.defineProperties(ScheduleDisplay, {
		title: {
			value: title,
		},
		pieChart: {
			value: pieChart,
		},
		writing: {
			value: writing,
		},
	});

	return ScheduleDisplay;
})();



var ScheduleTitle = (function() {
	var ScheduleTitle = function() {
		var title = SchedulingForm.title.value;
		if(!ScheduleTitle.isTitle(title)) {
			title = SubstituteSchedule.title;
		}

		Object.defineProperties(this, {
			title: {value: title},
			handler: {value: new Handler(SchedulingForm.title)},
		});
	};

	ScheduleTitle.prototype.addChangeListener = function(listener) {
		return this.handler.addListener('change', listener, false);
	};

	ScheduleTitle.prototype.removeAllListener = function() {
		this.handler.removeAllListener();
	};

	ScheduleTitle.prototype.getTitle = function() {
		return this.title;
	};

	ScheduleTitle.isTitle = function(title) {
		return typeof title === 'string' && title !== '';
	};

	return ScheduleTitle;
})();
var ScheduleContent = (function() {
	var ScheduleContent = function(value) {
		Object.defineProperty(this, 'value', {value: value});
	};

	ScheduleContent.prototype.getValue = function() {
		return this.value;
	};
	//static
	ScheduleContent.isValue = function(value) {
		return typeof value === 'string' && value !== '';
	};

	return ScheduleContent;
})();
var ScheduleName = (function() {
	var ScheduleName = function(name) {
		if(typeof name === 'undefined') {
			name = SchedulingForm.scheduleName.value;
		}
		if(!ScheduleContent.isValue(name)) {
			name = SubstituteSchedule.name;
		}
		ScheduleContent.call(this, name);
	};

	ScheduleName.prototype = Object.create(ScheduleContent.prototype, {
		constructor: {value: ScheduleName},
	});

	return ScheduleName;
})();
var ScheduleDetail = (function() {
	var ScheduleDetail = function(detail) {
		if(typeof detail === 'undefined') {
			detail = SchedulingForm.detail.value;
		}
		if(!ScheduleContent.isValue(detail)) {
			value = SubstituteSchedule.detail;
		}
		ScheduleContent.call(this, detail);
	};

	ScheduleDetail.prototype = Object.create(ScheduleContent.prototype, {
		constructor: {value: ScheduleDetail},
	});

	return ScheduleDetail;
})();
var ScheduleTime = (function() {
	var ScheduleTime = function(hour, minute) {
		if(!ScheduleTime.isTime(hour) || !ScheduleTime.isTime(minute)) {
			throw new TypeError();
		}

		Object.defineProperties(this, {
			hour: {value: ScheduleTime.fixHour(hour)},
			minute: {value: ScheduleTime.fixSimpleMinute(minute)},
		});
	};

	//0~23のいずれかを返す;
	ScheduleTime.prototype.getHour = function() {
		return this.hour;
	};
	//0,1,2,3のいずれかを返す;
	ScheduleTime.prototype.getMinute = function() {
		return this.minute;
	};

	//0~23のいずれかを返す;
	ScheduleTime.fixHour = function(hour) {
		hour = Math.floor(Number(hour)) || 0;
		if(hour < 0) {
			hour = 24 + hour % 24;
		}else if(hour > 23) {
			hour = hour % 24;
		}
		return hour;
	};

	//0,1,2,3のいずれかを返す;
	ScheduleTime.fixSimpleMinute = function(minute) {
		minute = Math.floor(Number(minute)) || 0;
		if(minute < 0) {
			minute = 0;
		}else if(minute > 45) {
			minute = 45;
		}
		return Math.floor(minute / 15);		
	};

	//0,1,2,3で表されてるminuteを0,15,30,45に直す;
	ScheduleTime.fixMinute = function(simpleMinute) {
		if(!ScheduleTime.isTime(simpleMinute)) {
			return null;
		}
		simpleMinute = Math.floor(simpleMinute);
		if(simpleMinute < 0) {
			return 60 + simpleMinute % 4 * 15;
		}
		return simpleMinute % 4 * 15;
	};

	ScheduleTime.isTime = function(time) {
		return typeof time === 'number' && isFinite(time);
	};

	//0:00のような文字列を返す;
	ScheduleTime.getTime = function(hour, simpleMinute) {
		if(!ScheduleTime.isTime(hour) || !ScheduleTime.isTime(simpleMinute)) {
			throw new TypeError();
		}
		hour = ScheduleTime.fixHour(hour);
		//0分の場合末尾に0を追加する;
		return hour + ':' + (ScheduleTime.fixMinute(simpleMinute) || '00');
	}

	return ScheduleTime;
})();

var ScheduleStartTime = (function() {
	var ScheduleStartTime = function() {
		var hour = Number(SchedulingForm.startHour.value) || 0;
		var minute = Number(SchedulingForm.startMinute.value) || 0;
		ScheduleTime.call(this, hour, minute);
	};

	ScheduleStartTime.prototype = Object.create(ScheduleTime.prototype, {
		constructor: {value: ScheduleStartTime},
	});

	return ScheduleStartTime;
})();
var ScheduleFinishTime = (function() {
	var ScheduleFinishTime = function() {
		var hour = Number(SchedulingForm.finishHour.value) || 0;
		var minute = Number(SchedulingForm.finishMinute.value) || 0;
		ScheduleTime.call(this, hour, minute);
	};

	ScheduleFinishTime.prototype = Object.create(ScheduleTime.prototype, {
		constructor: {value: ScheduleFinishTime},
	});

	return ScheduleFinishTime;
})();

var ScheduleStartPoint = (function() {
	var ScheduleStartPoint = function(time/*Object*/) {
		var hour, minute;
		if(typeOf(time) === 'Object') {
			hour = time.hour;
			minute = time.minute;
		}else {
			hour = SchedulingForm.startPointHour.value;
			minute = SchedulingForm.startPointMinute.value;
		}

		if(hour === '' || !ScheduleTime.isTime(Number(hour))) {
			hour = null;
		}else {
			hour = ScheduleTime.fixHour(Number(hour));
		}
		if(minute === '' || !ScheduleTime.isTime(Number(minute))) {
			minute = null;
		}else {
			minute = ScheduleTime.fixSimpleMinute(Number(minute));
		}

		Object.defineProperties(this, {
			hour: {value: hour},
			minute: {value: minute},
			handlerOfHour: {value: new Handler(SchedulingForm.startPointHour)},
			handlerOfMinute: {value: new Handler(SchedulingForm.startPointMinute)},
		});
	};

	ScheduleStartPoint.prototype.getHour = function() {
		return this.hour;
	};
	ScheduleStartPoint.prototype.getMinute = function() {
		return this.minute;
	};

	ScheduleStartPoint.prototype.addChangeListener = function(listener) {
		this.handlerOfHour.addListener('change', listener, false);
		this.handlerOfMinute.addListener('change', listener, false);
	};

	ScheduleStartPoint.prototype.removeAllListener = function() {
		this.handlerOfHour.removeAllListener();
		this.handlerOfMinute.removeAllListener();
	};

	return ScheduleStartPoint;
})();

var ScheduleHourForm = (function() {
	var ScheduleHourForm = function(element) {
		if(element.getAttribute('type') !== 'number') {
			throw new TypeError();
		}

		Object.defineProperties(this, {
			element: {value: element},
			handler: {value: new Handler(element)},
		});
	};

	ScheduleHourForm.prototype.increment = function() {
		var hour = Number(this.element.value);
		if(!ScheduleTime.isTime(hour) || hour < 0 || hour >= 23) {
			this.element.value = '0';
			return;
		}
		this.element.value = hour + 1;
		return;
	};
	ScheduleHourForm.prototype.decrement = function() {
		var hour = Number(this.element.value);
		if(!ScheduleTime.isTime(hour) || hour <= 0 || hour > 23) {
			this.element.value = '23';
			return;
		}
		this.element.value = hour - 1;
		return;
	};

	ScheduleHourForm.prototype.addFocusListener = function() {
		this.handler.addListener('focus', function() {
			var mousewheel = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
			var handler = new Handler(this.element);
			handler.addListener(mousewheel, mousewheelListener.bind(this), false);

			handler.addListener('blur', function() {
				handler.removeAllListener();
			}, false);
		}.bind(this), false);
	};

	function mousewheelListener(e) {
		var delta = e.deltaY ? -(e.deltaY) : e.wheelDelta ? e.wheelDelta : -(e.detail);
		if(delta < 0) {
			//下にスクロールした場合の処理
			e.preventDefault();
			e.stopPropagation();
			this.decrement();
		}else if(delta > 0) {
			//上にスクロールした場合の処理
			e.preventDefault();
			e.stopPropagation();
			this.increment();
		}
	}

	return ScheduleHourForm;
})();

var ScheduleMinuteForm = (function() {
	var ScheduleMinuteForm = function(element) {
		if(element.getAttribute('type') !== 'number') {
			throw new TypeError();
		}

		Object.defineProperties(this, {
			element: {value: element},
			handler: {value: new Handler(element)},
		});
	};

	ScheduleMinuteForm.prototype.increment = function() {
		var minute = Math.floor(Number(this.element.value) / 15);
		if(!ScheduleTime.isTime(minute) || minute < 0 || minute >= 3) {
			this.element.value = '0';
			return;
		}
		this.element.value = minute * 15 + 15;
		return;
	};
	ScheduleMinuteForm.prototype.decrement = function() {
		var minute = Math.floor(Number(this.element.value) / 15);
		if(!ScheduleTime.isTime(minute) || minute <= 0 || minute > 3) {
			this.element.value = '45';
			return;
		}
		this.element.value = minute * 15 - 15;
		return;
	};

	ScheduleMinuteForm.prototype.addFocusListener = function() {
		this.handler.addListener('focus', function() {
			var mousewheel = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
			var handler = new Handler(this.element);
			handler.addListener(mousewheel, mousewheelListener.bind(this), false);

			handler.addListener('blur', function() {
				handler.removeAllListener();
			}, false);
		}.bind(this), false);
	};

	function mousewheelListener(e) {
		var delta = e.deltaY ? -(e.deltaY) : e.wheelDelta ? e.wheelDelta : -(e.detail);
		if(delta < 0) {
			//下にスクロールした場合の処理
			e.preventDefault();
			e.stopPropagation();
			this.decrement();
		}else if(delta > 0) {
			//上にスクロールした場合の処理
			e.preventDefault();
			e.stopPropagation();
			this.increment();
		}
	}

	return ScheduleMinuteForm;
})();

var ScheduleColor = (function() {
	var ScheduleColor = function(color) {
		Object.defineProperty(this, 'color', {value: color});
	};
	
	//colorコードでない文字列ならnullを返す;
	ScheduleColor.prototype.getColor = function() {
		return this.color;
	};
	//正当なcolorコードか真偽を返す;
	ScheduleColor.isColor = function(color) {
		var reg = new RegExp(/^#([\da-fA-F]{6}|[\da-fA-F]{3})$/);
		return reg.test(color);
	};

	return ScheduleColor;
})();
var ScheduleBackColor = (function() {
	var ScheduleBackColor = function(color) {
		if(typeof color === 'undefined') {
			color = SchedulingForm.backColor.value;
		}
		if(!ScheduleColor.isColor(color)) {
			color = SubstituteSchedule.backColor;
		}
		ScheduleColor.call(this, color);
	};

	ScheduleBackColor.prototype = Object.create(ScheduleColor.prototype, {
		constructor: {value: ScheduleBackColor},
	});

	return ScheduleBackColor;
})();
var ScheduleFontColor = (function() {
	var ScheduleFontColor = function(color) {
		if(typeof color === 'undefined') {
			color = SchedulingForm.fontColor.value;
		}
		if(!ScheduleColor.isColor(color)) {
			color = SubstituteSchedule.fontColor;
		}
		ScheduleColor.call(this, color);
	};

	ScheduleFontColor.prototype = Object.create(ScheduleColor.prototype, {
		constructor: {value: ScheduleFontColor},
	});

	return ScheduleFontColor;
})();
var ScheduleLineColor = (function() {
	var ScheduleLineColor = function() {
		var color = SchedulingForm.lineColor.value;
		if(!ScheduleColor.isColor(color)) {
			color = SubstituteSchedule.lineColor;
		}
		ScheduleColor.call(this, color);
		Object.defineProperty(this, 'handler', {value: new Handler(SchedulingForm.lineColor)});
	};

	ScheduleLineColor.prototype = Object.create(ScheduleColor.prototype, {
		constructor: {value: ScheduleLineColor},
	});

	ScheduleLineColor.prototype.addChangeListener = function(listener) {
		return this.handler.addListener('change', listener, false);
	};

	ScheduleLineColor.prototype.removeAllListener = function() {
		this.handler.removeAllListener();
	}

	return ScheduleLineColor;
})();

//Colorクラス;
var Color = (function() {
	//コンストラクタ;
	//colorコードを引数に取る;
	var Color = function(color) {
		//colorコードが不正であればエラーを返す;
		if(!Color.isColor(color)) {
			throw new TypeError();
		}

		Object.defineProperties(this, {
			color: {
				get: function() {
					return color;
				},
				set: function(value) {
					if(Color.isColor(value)) {
						color = value;
					}
				},
				enumerable: true,
				configurable: false,
			},
		});
	};

	//colorコードの"#"を除いた16進数で表された部分を文字列で返す;
	Color.prototype.getRGB = function() {
		return this.color.replace('#', '');
	};

	//RGBのRの値を0~255の10進数で返す;
	Color.prototype.getRed = function() {
		var rgb = this.getRGB();
		if(rgb.length === 3) {
			var red = rgb.slice(0, 1);
			red = red + red;
		}else {
			var red = rgb.slice(0, 2);
		}
		return parseInt(red, 16);
	};

	//RGBのGの値を0~255の10進数で返す;
	Color.prototype.getGreen = function() {
		var rgb = this.getRGB();
		if(rgb.length === 3) {
			var green = rgb.slice(1, 2);
			green = green + green;
		}else {
			var green = rgb.slice(2, 4);
		}
		return parseInt(green, 16);
	};

	//RGBのBの値を0~255の10進数で返す;
	Color.prototype.getBlue = function() {
		var rgb = this.getRGB();
		if(rgb.length === 3) {
			var blue = rgb.slice(2, 3);
			blue = blue + blue;
		}else {
			var blue = rgb.slice(4, 6);
		}
		return parseInt(blue, 16);
	};

	//明度を返す;
	Color.prototype.getBrightness = function() {
		var red = this.getRed();
		var green = this.getGreen();
		var blue = this.getBlue();

		return ((red * 299) + (green * 587) + (blue * 114)) / 1000;
	};

	//明るいか暗いかの真偽値を返す;
	//明るければtrue;
	//基準は明度127.5;
	Color.prototype.isBright = function() {
		return (this.getBrightness() > 255 / 2) ? true : false;
	};

	//視認性を確保するため明度差125のカラーコードを返す;
	//小数点切り捨てのため正確には明度差は125以下になる;
	Color.prototype.getBrightnessDifference125Color = function() {
		var difference = 125;
		//各色の明度の補正値;
		//色を変換する時に使う;
		var redCorrection = 299;
		var greenCorrection = 587;
		var blueCorrection = 114;

		//各色に加えるまたは減らすべき色の値;
		//基本的に各色125ずつ変化させる;
		//変化出来ない場合各色に変換する;
		var redRemainder = difference;
		var greenRemainder = difference;
		var blueRemainder = difference;

		//現在の各色を取得;
		var red = this.getRed();
		var green = this.getGreen();
		var blue = this.getBlue();

		if(this.isBright()) {
			//明るい時の処理;
			//明度125暗くなる;
			//各色を0に近づけていく;
			while(redRemainder + greenRemainder + blueRemainder > 0) {
				if(red - redRemainder < 0) {
					//redをこれ以上暗くできない時の処理;
					redRemainder = redRemainder - red;
					red = 0;
					//余りのredを各色に変換し振り分ける;
					greenRemainder += changeColor(redCorrection, greenCorrection, redRemainder / 2);
					blueRemainder += changeColor(redCorrection, blueCorrection, redRemainder / 2);
					redRemainder = 0;
				}else {
					red = red - redRemainder;
					redRemainder = 0;
				}
				if(green - greenRemainder < 0) {
					//greenをこれ以上暗くできない時の処理;
					greenRemainder = greenRemainder - green;
					green = 0;
					//余りのgreenを各色に変換し振り分ける;
					blueRemainder += changeColor(greenCorrection, blueCorrection, greenRemainder / 2);
					redRemainder += changeColor(greenCorrection, redCorrection, greenRemainder / 2);
					greenRemainder = 0;
				}else {
					green = green - greenRemainder;
					greenRemainder = 0;
				}
				if(blue - blueRemainder < 0) {
					//blueをこれ以上暗くできない時の処理;
					blueRemainder = blueRemainder - blue;
					blue = 0;
					//余りのblueを各色に変換し振り分ける;
					redRemainder += changeColor(blueCorrection, redCorrection, blueRemainder / 2);
					greenRemainder += changeColor(blueCorrection, greenCorrection, blueRemainder / 2);
					blueRemainder = 0;
				}else {
					blue = blue - blueRemainder;
					blueRemainder = 0;
				}
			}
		}else {
			//暗い時の処理;
			//明度125明るくなる;
			//各色を255(0xff)に近づけていく;
			while(redRemainder + greenRemainder + blueRemainder > 0) {
				if(red + redRemainder > 0xff) {
					//redをこれ以上明るくできない時の処理;
					redRemainder = redRemainder - (0xff - red);
					red = 0xff;
					//余りのredを各色に変換し振り分ける;
					greenRemainder += changeColor(redCorrection, greenCorrection, redRemainder / 2);
					blueRemainder += changeColor(redCorrection, blueCorrection, redRemainder / 2);
					redRemainder = 0;
				}else {
					red = red + redRemainder;
					redRemainder = 0;
				}
				if(green + greenRemainder > 0xff) {
					//greenをこれ以上明るくできない時の処理;
					greenRemainder = greenRemainder - (0xff - green);
					green = 0xff;
					//余りのgreenを各色に変換し振り分ける;
					blueRemainder += changeColor(greenCorrection, blueCorrection, greenRemainder / 2);
					redRemainder += changeColor(greenCorrection, redCorrection, greenRemainder / 2);
					greenRemainder = 0;
				}else {
					green = green + greenRemainder;
					greenRemainder = 0;
				}
				if(blue + blueRemainder > 0xff) {
					//blueをこれ以上明るくできない時の処理;
					blueRemainder = blueRemainder - (0xff - blue);
					blue = 0xff;
					//余りのblueを各色に変換し振り分ける;
					redRemainder += changeColor(blueCorrection, redCorrection, blueRemainder / 2);
					greenRemainder += changeColor(blueCorrection, greenCorrection, blueRemainder / 2);
					blueRemainder = 0;
				}else {
					blue = blue + blueRemainder;
					blueRemainder = 0;
				}
			}
		}
		//カラーコードに変換して返す;
		return '#' + Color.convertedToRGB(red, green, blue);

		//各色を変換するための関数;
		function changeColor(fromColorCorrection, toColorCorrection, color) {
			//ここで小数点を切り捨てるため、正確さが多少失われる;
			return Math.floor(fromColorCorrection / toColorCorrection * color);
		}
	};

	//カラーコードに1を足す;
	Color.prototype.increment = function() {
		var rgb = this.getRGB();
		if(rgb.length === 3) {
			rgb = increment3digitRGB(rgb);
		}else {
			rgb = increment6digitRGB(rgb);
		}
		return this.color = '#' + rgb;
	};
	//カラーコードに1を引く;
	Color.prototype.decrement = function() {
		var rgb = this.getRGB();
		if(rgb.length === 3) {
			rgb = decrement3digitRGB(rgb);
		}else {
			rgb = decrement6digitRGB(rgb);
		}
		return this.color = '#' + rgb;
	};

	//RGB3桁の省略形のインクリメント関数;
	function increment3digitRGB(rgb) {
		var numRGB = parseInt(rgb, 16);
		if(numRGB >= 0xfff) {
			return '000';
		}
		numRGB += 1;
		rgb = numRGB.toString(16);
		//0埋め;
		while(rgb.length < 3) {
			rgb = '0' + rgb;
		}

		return rgb;
	}
	function increment6digitRGB(rgb) {
		var numRGB = parseInt(rgb, 16);
		if(numRGB >= 0xffffff) {
			return '000000';
		}
		numRGB += 1;
		rgb = numRGB.toString(16);
		//0埋め;
		while(rgb.length < 6) {
			rgb = '0' + rgb;
		}

		return rgb;
	}

	//RGB3桁の省略形のデクリメント関数;
	function decrement3digitRGB(rgb) {
		var numRGB = parseInt(rgb, 16);
		if(numRGB <= 0) {
			return 'fff';
		}
		numRGB -= 1;
		rgb = numRGB.toString(16);
		//0埋め;
		while(rgb.length < 3) {
			rgb = '0' + rgb;
		}

		return rgb;
	}
	function decrement6digitRGB(rgb) {
		var numRGB = parseInt(rgb, 16);
		if(numRGB <= 0) {
			return 'ffffff';
		}
		numRGB -= 1;
		rgb = numRGB.toString(16);
		//0埋め;
		while(rgb.length < 6) {
			rgb = '0' + rgb;
		}

		return rgb;
	}

	//正当なcolorコードか真偽を返す;
	Color.isColor = function(colorCode) {
		var reg = new RegExp(/^#([\da-fA-F]{6}|[\da-fA-F]{3})$/);
		return reg.test(colorCode);
	};

	//10進数のred,green,blueを16進数で表したRGBに変換し、その文字列を返す;
	Color.convertedToRGB = function(red, green, blue) {
		function convert(color) {
			color = color.toString(16);
			while(color.length < 2) {
				color = '0' + color;
			}
			return color;
		}
		
		return convert(red) + convert(green) + convert(blue);
	}

	return Color;
})();

//ColorFormクラス;
var ColorForm = (function() {
	//コンストラクタ;
	//input[type="color"]の要素を引数に取る;
	//baseColorは任意;
	var ColorForm = function(element, baseColor) {
		//elementがcolorフォームでないならエラーを返す;
		if(element.getAttribute('type') !== 'color') {
			throw new TypeError();
		}

		//baseColorが不正であればbaseColorは白になる;
		if(!Color.isColor(baseColor)) {
			baseColor = "#ffffff"
		}

		//色はcolorクラスで管理する;
		Object.defineProperties(this, {
			element: {value: element},
			color: {value: new Color(baseColor)},
			handler: {value: new Handler(element)},
			baseColor: {value: baseColor},
		});
	};

	//focus時のイベントリスナー
	//focus時以外は発火させないためfocus時に他のイベントを登録し,blur時に定義したイベントを全て消す;
	ColorForm.prototype.addFocusListener = function() {
		//firefoxとchromeとsafariは発火させない;
		var userAgent = window.navigator.userAgent.toLowerCase();
		if(userAgent.indexOf('firefox') != -1) {
			return;
		}else if(userAgent.indexOf('chrome') != -1) {
			return;
		}else if(userAgent.indexOf('safari') != -1) {
			return;
		}

		this.handler.addListener('focus', function() {
			this.setColor();
			this.setStyle();

			//各ブラウザのmousewheelイベント統一する;
			var mousewheel = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
			var handler = new Handler(this.element);
			handler.addListener(mousewheel, mousewheelListener.bind(this), false);
			handler.addListener('keyup', keyupListener.bind(this), false);

			handler.addListener('blur', function() {
				handler.removeAllListener();
			}, false);
		}.bind(this), false);
	};

	//マウスホイールイベント;
	//ホイールでカラーコードを加減し、背景色と文字色を変える;
	function mousewheelListener(e) {
		var delta = e.deltaY ? -(e.deltaY) : e.wheelDelta ? e.wheelDelta : -(e.detail);
		if(delta < 0) {
			//下にスクロールした場合の処理
			e.preventDefault();
			this.decrement();
			this.setStyle();
		}else if(delta > 0) {
			//上にスクロールした場合の処理
			e.preventDefault();
			this.increment();
			this.setStyle();
		}
	};

	function keyupListener() {
		this.setColor();
		this.setStyle();
	}

	ColorForm.prototype.getColor = function() {
		return this.color.color;
	};

	//現在のelement.valueをcolorオブジェクトにセットする;
	ColorForm.prototype.setColor = function() {
		this.color.color = (Color.isColor(this.element.value)) ? this.element.value : this.baseColor;
	};

	ColorForm.prototype.increment = function() {
		this.color.increment();
		this.element.value = this.getColor();
	};
	ColorForm.prototype.decrement = function() {
		this.color.decrement();
		this.element.value = this.getColor();
	};

	//背景色と文字色を変更する;
	//背景色はvalueと同じ;
	//文字色は背景色の明度差125の色;
	ColorForm.prototype.setStyle = function() {
		this.element.style.backgroundColor = this.getColor();
		this.element.style.color = this.color.getBrightnessDifference125Color();
	};

	return ColorForm;
})();

//class;
var SchedulingButton = (function() {
	var SchedulingButton = function(button) {
		if(!button instanceof Element) {
			throw new TypeError();
		}
		Object.defineProperties(this, {
			button: {value: button},
			handler: {value: new Handler(button)},
		});
	};

	SchedulingButton.prototype.addClickListener = function(listener) {
		return this.handler.addListener('click', listener, false);
	};
	SchedulingButton.prototype.removeAllListener = function() {
		this.handler.removeAllListener();
	};

	return SchedulingButton;
})();

var UndoButton = (function() {
	var UndoButton = function() {
		var button = SchedulingForm.undoButton;
		SchedulingButton.call(this, button);
	};

	UndoButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: UndoButton},
	});

	return UndoButton;
})();

var RedoButton = (function() {
	var RedoButton = function() {
		var button = SchedulingForm.redoButton;
		SchedulingButton.call(this, button);
	};

	RedoButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: RedoButton},
	});

	return RedoButton;
})();

var AddButton = (function() {
	var AddButton = function() {
		var button = SchedulingForm.addButton;
		SchedulingButton.call(this, button);
	};

	AddButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: AddButton},
	});

	return AddButton;
})();

var SaveButton = (function() {
	var SaveButton = function() {
		var button = SchedulingForm.saveButton;
		SchedulingButton.call(this, button);
	};

	SaveButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: SaveButton},
	});

	return SaveButton;
})();

var OverwriteButton = (function() {
	var OverwriteButton = function() {
		var button = SchedulingForm.overwriteButton;
		SchedulingButton.call(this, button);
	};

	OverwriteButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: OverwriteButton},
	});

	return OverwriteButton;
})();

var ResetButton = (function() {
	var ResetButton = function() {
		var button = SchedulingForm.resetButton;
		SchedulingButton.call(this, button);
	};

	ResetButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: ResetButton},
	});

	return ResetButton;
})();

var AllRemoveButton = (function() {
	var AllRemoveButton = function() {
		var button = SchedulingForm.allRemoveButton;
		SchedulingButton.call(this, button);
	};

	AllRemoveButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: AllRemoveButton},
	});

	return AllRemoveButton;
})();

var AllRestoreButton = (function() {
	var AllRestoreButton = function() {
		var button = SchedulingForm.allRestoreButton;
		SchedulingButton.call(this, button);
	};

	AllRestoreButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: AllRestoreButton},
	});

	return AllRestoreButton;
})();

var EditButton = (function() {
	var EditButton = function(button) {
		SchedulingButton.call(this, button);
	};

	EditButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: EditButton},
	});

	return EditButton;
})();

var RemoveButton = (function() {
	var RemoveButton = function(button) {
		SchedulingButton.call(this, button);
	};

	RemoveButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: RemoveButton},
	});

	return RemoveButton;
})();

var RestoreButton = (function() {
	var RestoreButton = function(button) {
		SchedulingButton.call(this, button);
	};

	RestoreButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: RestoreButton},
	});

	return RestoreButton;
})();


var ImageDownloadButton = (function() {
	var ImageDownloadButton = function() {
		var button = SchedulingForm.imageDownloadButton;
		SchedulingButton.call(this, button);
	};

	ImageDownloadButton.prototype = Object.create(SchedulingButton.prototype, {
		constructor: {value: ImageDownloadButton},
	});

	return ImageDownloadButton;
})();

var SchedulingData = (function() {
	var SchedulingData = function(obj) {
		if(typeof obj === null || typeof obj !== 'object') {
			obj = {};
		}
		var scheduleName = new ScheduleName(obj.name);
		var scheduleDetail = new ScheduleDetail(obj.detail);
		var scheduleStartTime = new ScheduleStartTime(obj.startHour, obj.startMinute);
		var scheduleFinishTime = new ScheduleFinishTime(obj.finishHour, obj.finishMinute);
		var scheduleBackColor = new ScheduleBackColor(obj.backColor);
		var scheduleFontColor = new ScheduleFontColor(obj.fontColor);
		Object.defineProperties(this, {
			name: {
				value: scheduleName.getValue(),
				enumerable: true,
			},
			detail: {
				value: scheduleDetail.getValue(),
				enumerable: true,
			},
			startHour: {
				value: scheduleStartTime.getHour(),
				enumerable: true,
			},
			startMinute: {
				value: scheduleStartTime.getMinute(),
				enumerable: true,
			},
			finishHour: {
				value: scheduleFinishTime.getHour(),
				enumerable: true,
			},
			finishMinute: {
				value: scheduleFinishTime.getMinute(),
				enumerable: true,
			},
			backColor: {
				value: scheduleBackColor.getColor(),
				enumerable: true,
			},
			fontColor: {
				value: scheduleFontColor.getColor(),
				enumerable: true,
			},
		});
	};
	//0時を通り過ぎるか;
	SchedulingData.prototype.passesMidnight = function() {
		if(this.startHour > this.finishHour) {
			return true;
		}
		if(this.startHour < this.finishHour) {
			return false;
		}
		if(this.startMinute >= this.finishMinute) {
			return true;
		}else {
			return false;
		}
	};

	return SchedulingData;
})();

//全体のscheduleを管理するクラス;
//SchedulingFormを継承してる個々のクラスからデータを受け取り、scheduleに追加し、一日のscheduleを作成していく;
var Scheduler = (function() {
	var Scheduler = function(daySchedule) {
		var additionInfo = new Object();
		var history = new HistoryManager();
		var schedulingData = null;

		//dayScheduleを初期化する;
		this.init = function() {
			daySchedule = {};
			for(var hour = 0; hour < 24; hour++) {
				daySchedule[hour] = [];
				for(var minute = 0; minute < 4; minute++) {
					daySchedule[hour][minute] = {
						name: SubstituteSchedule.name,
						detail: SubstituteSchedule.detail,
						backColor: SubstituteSchedule.backColor,
						fontColor: SubstituteSchedule.fontColor,
					};
				}
			}
			daySchedule.length = 24;

			additionInfo = {};
			additionInfo.title = SubstituteSchedule.title;
			additionInfo.lineColor = SubstituteSchedule.lineColor;
			additionInfo.startPointHour = SubstituteSchedule.startPointHour;
			additionInfo.startPointMinute = SubstituteSchedule.startPointMinute;

			history.add(this.getDaySchedule());
		};

		this.getDaySchedule = function() {
			var keys = Object.keys(additionInfo);
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				daySchedule[key] = additionInfo[key];
			}
			return clone(daySchedule);
		};

		/*
		this.getTimeSchedule = function(hour, minute) {
			if(!(0 <= hour && hour < daySchedule.length)) {
				return {};
			}else if(!(0 < minute && minute < daySchedule[hour].length)) {
				return {};
			}
			return clone(daySchedule[hour][minute]);
		};
		*/

		function setSchedulingData(data) {
			if(!(data instanceof SchedulingData)) {
				throw new TypeError();
			}
			schedulingData = data;
		}
		function addTimeSchedule(time, schedulingData) {

			daySchedule[time.hour][time.minute].name = schedulingData.name;
			daySchedule[time.hour][time.minute].detail = schedulingData.detail;
			daySchedule[time.hour][time.minute].backColor = schedulingData.backColor;
			daySchedule[time.hour][time.minute].fontColor = schedulingData.fontColor;
		}
		this.add = function(schedulingData) {
			setSchedulingData(schedulingData);
			//sched*uleは0時を通るか;
			if(schedulingData.passesMidnight()) {
				var hour = schedulingData.startHour, minute = schedulingData.startMinute;
				//startから24時まで追加;
				while(hour < 24) {
					while(minute < 4) {
						addTimeSchedule({hour: hour, minute: minute}, schedulingData);
						minute++;
					}
					hour++;
					minute = 0;
				}
				//0時からfinishHourまで追加;
				hour = 0
				while(hour < schedulingData.finishHour) {
					while(minute < 4) {
						addTimeSchedule({hour: hour, minute: minute}, schedulingData);
						minute++;
					}
					hour++;
					minute = 0;
				}
				//finishHourの0分からfinishMinuteまで追加;
				while(minute < schedulingData.finishMinute) {
					addTimeSchedule({hour: hour, minute: minute}, schedulingData);
					minute++;
				}
			}else {
				var hour = schedulingData.startHour, minute = schedulingData.startMinute;
				while(hour < schedulingData.finishHour) {
					while(minute < 4) {
						addTimeSchedule({hour: hour, minute: minute}, schedulingData);
						minute++;
					}
					hour++;
					minute = 0;
				}
				while(minute < schedulingData.finishMinute) {
					addTimeSchedule({hour: hour, minute: minute}, schedulingData);
					minute++;
				}
			}
			history.add(this.getDaySchedule());
		};

		this.setTitle = function(title) {
			if(title instanceof ScheduleTitle) {
				additionInfo.title = title.getTitle();
			}
		};

		this.setLineColor = function(lineColor) {
			if(lineColor instanceof ScheduleLineColor) {
				additionInfo.lineColor = lineColor.getColor();
			}
		};

		this.setStartPoint = function(startPoint) {
			if(startPoint instanceof ScheduleStartPoint) {
				additionInfo.startPointHour = startPoint.getHour();
				additionInfo.startPointMinute = startPoint.getMinute();
			}
		};

		this.undo = function() {
			if(!history.undoes()) {
				return;
			}
			daySchedule = history.undo();
		};
		this.redo = function() {
			if(!history.redoes()) {
				return;
			}
			daySchedule = history.redo();
		};


		if(!Scheduler.isDaySchedule(daySchedule)) {
			this.init();
		}else {
			var keys = Object.keys(daySchedule);
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				if(key < daySchedule.length) {
					continue;
				}

				additionInfo[key] = daySchedule[key];
			}
			history.add(this.getDaySchedule());
		}

	}

	Scheduler.isDaySchedule = function(daySchedule) {
		if(typeOf(daySchedule) !== 'Object') {
			return false;
		}
		for(var i = 0; i < 24; i++) {
			if(!Array.isArray(daySchedule[i])) {
				return false;
			}
			for(var j = 0; j < 4; j++) {
				if(typeOf(daySchedule[i][j]) !== 'Object') {
					return false;
				}
			}
		}
		return true;
	}

	return Scheduler;
})();

var HistoryManager = (function() {
	var HistoryManager = function() {
		this.history = [];
		this.redoList = [];
	};
	HistoryManager.prototype.getEnd = function() {
		return clone(this.history[this.history.length - 1]);
	};
	HistoryManager.prototype.add = function(data) {
		this.history.push(data);
		this.redoList.length = 0;
		return this;
	};
	HistoryManager.prototype.undoes = function() {
		return this.history.length > 1;
	};
	HistoryManager.prototype.redoes = function() {
		return this.redoList.length > 0;
	};
	HistoryManager.prototype.undo = function() {
		if(this.undoes()) {
			this.redoList.push(this.history.pop());
		}
		return this.getEnd();
	};
	HistoryManager.prototype.redo = function() {
		if(this.redoes()) {
			this.history.push(this.redoList.pop());
		}
		return this.getEnd();
	};

	return HistoryManager;
})();



//スーパークラス;
//dayScheduleを解析して、整形する;
//整形することによって一日の予定をグラフやテキストに表しやすくなる;
var ScheduleAnalyst = (function() {
	var ScheduleAnalyst = function(daySchedule) {
		//dayScheduleが渡されなかったらエラーを返す;
		if(!Scheduler.isDaySchedule(daySchedule)) {
			throw new TypeError();
		}

		Object.defineProperties(this, {
			daySchedule: {
				value: daySchedule,
			},
			formatSchedule: {
				value: new Array(),
			},
			//dayScheduleをどこから解析するかの開始点;
			startTime: {
				value: {
					hour: null,
					minute: null,
					get point() {
						return this.hour * 4 + this.minute;
					},
				},
				configurable: true,
			},
			//解析時の現時刻ポイント;
			currentTime: {
				value: {
					hour: 0,
					minute: 0,
					get point() {
						return this.hour * 4 + this.minute;
					},
				},
			},
			//現時刻の次の予定の時刻;
			nextTime: {
				value: {
					hour: 0,
					minute: 0,
					get point() {
						return this.hour * 4 + this.minute;
					},
				},
			},
		});

		//解析の開始点を決める;
		this.setStartingPoint();

		//現時刻に開始点を代入;
		this.currentTime.hour = this.startTime.hour;
		this.currentTime.minute = this.startTime.minute;
	};

	//開始点を決める;
	ScheduleAnalyst.prototype.setStartingPoint = function() {
		//scheduleは日を跨っているか;
		if(!this.isSameTimeSchedule(this.daySchedule[23][3], this.daySchedule[0][0])) {
			//跨っていないなら0時が開始点;
			this.startTime.hour = 0;
			this.startTime.minute = 0;
		}else {
			//跨っているなら0時のscheduleの次点のscheduleが開始点;
			this.currentTime.hour = 0;
			this.currentTime.minute = 0;
			this.moveNextPoint();
			this.startTime.hour = this.nextTime.hour;
			this.startTime.minute = this.nextTime.minute;
		}
	};

	//2つの引数のtimeScheduleが同じか否か真偽値を返す;
	ScheduleAnalyst.prototype.isSameTimeSchedule = function(currentSchedule, nextSchedule) {
		return (currentSchedule.name === nextSchedule.name && 
			currentSchedule.detail === nextSchedule.detail && 
			currentSchedule.backColor === nextSchedule.backColor && 
			currentSchedule.fontColor === nextSchedule.fontColor);
	};

	//現時刻が開始点かどうかの真偽値を返す;
	//scheduleの解析が一周したかを確かめるため;
	ScheduleAnalyst.prototype.isStartingPoint = function() {
		return this.currentTime.point === this.startTime.point;
	};

	//currentTimeをnextTimeに移動させる;
	ScheduleAnalyst.prototype.moveCurrentPointToNextPoint = function() {
		this.currentTime.hour = this.nextTime.hour;
		this.currentTime.minute = this.nextTime.minute;
	};
	//一つのスケジュールの円弧のサイズを求める;
	ScheduleAnalyst.prototype.getCurrentScheduleSize = function() {
		//15分区切りのため1時間のサイズは60 / 15 = 4, 一日のサイズは24 * 4 = 96;
		var currentPoint = this.currentTime.point;
		var nextPoint = this.nextTime.point;
		//0時を跨いでいるか;
		if(currentPoint >= nextPoint) {
			//currentPointよりnextPointの方が小さいとサイズを測れないため、1日分のサイズを追加;
			nextPoint += 96;
		}
		return nextPoint - currentPoint;
	};

	//nextTimeをcurrentTimeの予定の次の予定の時刻に移動する;
	ScheduleAnalyst.prototype.moveNextPoint = function() {
		//現時刻の予定;
		var currentSchedule = {
			name: this.daySchedule[this.currentTime.hour][this.currentTime.minute].name,
			detail: this.daySchedule[this.currentTime.hour][this.currentTime.minute].detail,
			backColor: this.daySchedule[this.currentTime.hour][this.currentTime.minute].backColor,
			fontColor: this.daySchedule[this.currentTime.hour][this.currentTime.minute].fontColor,
		};
		var hour = this.currentTime.hour, minute = this.currentTime.minute + 1;
		var flag = false;
		//現時刻から24時までループを回す;
		//現在の予定と違う時点でループを止める;
		while(hour < 24 && !flag) {
			while(minute < 4 && !flag) {
				var timeSchedule = this.daySchedule[hour][minute];
				var point = hour * 4 + minute;
				if(!this.isSameTimeSchedule(currentSchedule, timeSchedule) || 
					point === this.startTime.point) {
					//現在の予定と違う → 次の予定時刻なので時間を保存しループを止める;
					this.nextTime.hour = hour;
					this.nextTime.minute = minute;
					flag = true;
				}
				minute++;
			}
			hour++;
			minute = 0;
		}
		//日を跨いでいる可能性があるので0時から現在の時刻までループを回す;
		hour = 0, minute = 0;
		while(hour < this.currentTime.hour && !flag) {
			while(minute < 4 && !flag) {
				var timeSchedule = this.daySchedule[hour][minute];
				var point = hour * 4 + minute;
				if(!this.isSameTimeSchedule(currentSchedule, timeSchedule) || 
					point === this.startTime.point) {
					this.nextTime.hour = hour;
					this.nextTime.minute = minute;
					flag = true;
				}
				minute++;
			}
			hour++;
			minute = 0;
		}
		while(minute < this.currentTime.minute && !flag) {
			var timeSchedule = this.daySchedule[hour][minute];
			var point = hour * 4 + minute;
			if(!this.isSameTimeSchedule(currentSchedule, timeSchedule) || 
				point === this.startTime.point) {
				this.nextTime.hour = hour;
				this.nextTime.minute = minute;
				flag = true;
			}
			minute++;
		}

		//flagが立っていないということは24時間同じ予定ということなので次の時刻に現在時刻を代入;
		if(!flag) {
			this.nextTime.hour = this.currentTime.hour;
			this.nextTime.minute = this.currentTime.minute;
		}
	};

	//dayScheduleを解析して整形し、整形されたformatScheduleを返す;
	ScheduleAnalyst.prototype.shaping = function() {
		//現時刻を開始点の時刻に設定;
		this.currentTime.hour = this.startTime.hour;
		this.currentTime.minute = this.startTime.minute;

		do {
			//nextTimeを移動;
			this.moveNextPoint();

			//現時刻のスケジュールを参照;
			var timeSchedule = this.daySchedule[this.currentTime.hour][this.currentTime.minute];

			//現時刻のスケジュールの情報をformatScheduleに追加;
			this.formatSchedule.push({
				size: this.getCurrentScheduleSize(),
				startHour: this.currentTime.hour,
				startMinute: this.currentTime.minute,
				startPoint: this.currentTime.point,
				finishHour: this.nextTime.hour,
				finishMinute: this.nextTime.minute,
				finishPoint: this.nextTime.point,
				name: timeSchedule.name,
				detail: timeSchedule.detail,
				backColor: timeSchedule.backColor,
				fontColor: timeSchedule.fontColor,
			});

			//currentTimeを次に移動;
			this.moveCurrentPointToNextPoint();

		//currentTimeが一周するまでループを回す;
		}while(!this.isStartingPoint());

		this.shapingBriefly();

		return clone(this.formatSchedule);
	};

	ScheduleAnalyst.prototype.shapingBriefly = function() {
		this.formatSchedule.title = this.daySchedule.title;
		this.formatSchedule.lineColor = this.daySchedule.lineColor;

		return clone(this.formatSchedule);
	};

	ScheduleAnalyst.isFormatSchedule = function(formatSchedule) {
		if(!Array.isArray(formatSchedule)) {
			return false;
		}
		/*
		if(formatSchedule[0] === null || typeof formatSchedule[0] !== 'object') {
			return false;
		}
		*/
		return true;
	};

	return ScheduleAnalyst;
})();


var ScheduleExcludingDetailAnalyst = (function() {
	var ScheduleExcludingDetailAnalyst = function(daySchedule) {
		//開始点の引数は取らず、開始点は自動的に決める;
		ScheduleAnalyst.call(this, daySchedule);
		Object.freeze(this.startTime);
	};
	ScheduleExcludingDetailAnalyst.prototype = Object.create(ScheduleAnalyst.prototype, {
		constructor: {value: ScheduleExcludingDetailAnalyst},
	});

	//override;
	//detailを比較せずスルーする;
	ScheduleExcludingDetailAnalyst.prototype.isSameTimeSchedule = function(currentSchedule, nextSchedule) {
		return (currentSchedule.name === nextSchedule.name && 
			currentSchedule.backColor === nextSchedule.backColor && 
			currentSchedule.fontColor === nextSchedule.fontColor);
	};

	return ScheduleExcludingDetailAnalyst;
})();

var ScheduleStrictAnalyst = (function() {
	var ScheduleStrictAnalyst = function(daySchedule) {
		ScheduleAnalyst.call(this, daySchedule);
		//解析の開始点を決める;
		if(ScheduleTime.isTime(daySchedule.startPointHour) && ScheduleTime.isTime(daySchedule.startPointMinute)) {
			//開始点が指定されているのであれば代入;
			this.startTime.hour = daySchedule.startPointHour;
			this.startTime.minute = daySchedule.startPointMinute;
			//現時刻に開始点を代入;
			this.currentTime.hour = this.startTime.hour;
			this.currentTime.minute = this.startTime.minute;
		}
		Object.freeze(this.startTime);
	};

	ScheduleStrictAnalyst.prototype = Object.create(ScheduleAnalyst.prototype, {
		constructor: {
			value: ScheduleStrictAnalyst,
		},
	});

	return ScheduleStrictAnalyst;
})();


var ScheduleTitleWriter = (function() {
	var ScheduleTitleWriter = function(formatSchedule) {
		if(!ScheduleAnalyst.isFormatSchedule(formatSchedule)) {
			throw new TypeError();
		}
		Object.defineProperties(this, {
			formatSchedule: {
				value: formatSchedule,
			},
			writingArea: {
				value: ScheduleDisplay.title,
			},
		});
	};

	ScheduleTitleWriter.prototype.write = function() {
		this.writingArea.textContent = this.formatSchedule.title;
	};

	return ScheduleTitleWriter;
})();

//親クラス;
var ScheduleDrawer = (function() {
	var ScheduleDrawer = function(formatSchedule) {
		if(!ScheduleAnalyst.isFormatSchedule(formatSchedule)) {
			throw new TypeError();
		}
		Object.defineProperties(this, {
			formatSchedule: {
				value: formatSchedule,
			},
			//formatScheduleの個々のscheduleが入るプロパティ;
			currentSchedule: {
				value: null,
				writable: true,
				configurable: true,
			},
			//svg要素が入るプロパティ;
			canvas: {
				value: null,
				writable: true,
				configurable: true,
			},
			//一つのschedule(15分)の角度;
			oneScheduleDegree: {
				value: 360 / 96, //3.15;
			},
			//半径;
			r: {
				value: null,
				writable: true,
				configurable: true,
			},
			//中心点のX座標;
			cx: {
				value: null,
				writable: true,
				configurable: true,
			},
			//中心点のY座標;
			cy: {
				value: null,
				writable: true,
				configurable: true,
			},
			//円弧の始点の中心角;
			startDegree: {
				value: null,
				writable: true,
				configurable: true,
			},
			//円弧の終点の中心角;
			finishDegree: {
				value: null,
				writable: true,
				configurable: true,
			},
			//扇形の背景色;
			fill: {
				value: null,
				writable: true,
				configurable: true,
			},
			//線の幅;;
			strokeWidth: {
				value: null,
				writable: true,
				configurable: true,
			},
			//線の色;
			lineColor: {
				value: null,
				writable: true,
				configurable: true,
			},
			//scheduleNameが入るプロパティ;
			text: {
				value: null,
				writable: true,
				configurable: true,
			},
			fontColor: {
				value: null,
				writable: true,
				configurable: true,
			},
		});
		//this.oneScheduleRadian = this.oneScheduleDegree / 180 * Math.PI;
	};

	//始点の角度と終点の角度をセットする;
	ScheduleDrawer.prototype.setScheduleDegree = function() {
		this.startDegree = this.oneScheduleDegree * this.currentSchedule.startPoint;
		this.finishDegree = this.oneScheduleDegree * this.currentSchedule.finishPoint;
		if(this.finishDegree - this.startDegree < 0) {
			this.finishDegree += 360;
		}
	};
	ScheduleDrawer.prototype.setBackColor = function() {
		this.fill = this.currentSchedule.backColor;
	};
	ScheduleDrawer.prototype.setLineColor = function() {
		this.lineColor = this.formatSchedule.lineColor;
	};
	ScheduleDrawer.prototype.setText = function() {
		this.text = this.currentSchedule.name;
	};
	ScheduleDrawer.prototype.setFontColor = function() {
		this.fontColor = this.currentSchedule.fontColor;
	};

	//currentScheduleを円として描くか扇形として描くかの真偽値を返す;
	ScheduleDrawer.prototype.isCircle = function() {
		return this.formatSchedule.length === 1;
	};

	return ScheduleDrawer;
})();

var ScheduleSvgDrawer = (function() {
	var ScheduleSvgDrawer = function(formatSchedule) {
		ScheduleDrawer.call(this, formatSchedule);

		Object.defineProperties(this, {
			//svgのネームスペース;
			NS: {value: 'http://www.w3.org/2000/svg'},
		});
	};

	ScheduleSvgDrawer.prototype = Object.create(ScheduleDrawer.prototype, {
		constructor: {value: ScheduleSvgDrawer},
	});

	//円または扇形全ての線の色を塗る;
	ScheduleSvgDrawer.prototype.paintLineColor = function() {
		this.setLineColor();

		var arcGroup = this.canvas.querySelector('.arc-group');
		arcGroup.setAttributeNS(null, 'stroke', this.lineColor);
	};

	//currentScheduleを扇形として作り、path要素を返す;
	ScheduleSvgDrawer.prototype.createArc = function() {
		//円弧の始まりの座標;
		var startX = this.cx + this.r * Math.sin(this.startDegree / 180 * Math.PI);
		var startY = this.cy - this.r * Math.cos(this.startDegree / 180 * Math.PI);
		//円弧の終わりの座標;
		var finishX = this.cx + this.r * Math.sin(this.finishDegree / 180 * Math.PI);
		var finishY = this.cy - this.r * Math.cos(this.finishDegree / 180 * Math.PI);
		//扇形の中心角が180度を超えているかどうか;
		var largeArcFlag = (this.finishDegree - this.startDegree <= 180) ? 0 : 1;

		//扇形の中心点;
		var center = 'M' + this.cx + ' ' + this.cy + ' ';
		//扇形の中心点から円弧の始まりを線で結ぶ;
		var line = 'L' + startX + ' ' + startY + ' ';
		//円弧の終わりの座標まで弧を描く;
		var arc = 'A' +  this.r + ' ' + this.r + ' ' + 0 + ' ' + largeArcFlag + ' ' + 1 + ' ' + finishX + ' ' + finishY + 'Z';

		var path = document.createElementNS(this.NS, 'path');
		path.setAttributeNS(null, 'd', center + line + arc);
		path.setAttributeNS(null, 'fill', this.fill);

		return path;
	};
	//currentScheduleを円として作り、circle要素を返す;
	ScheduleSvgDrawer.prototype.createCircle = function() {
		var circle = document.createElementNS(this.NS, 'circle');
		circle.setAttributeNS(null, 'cx', this.cx);
		circle.setAttributeNS(null, 'cy', this.cy);
		circle.setAttributeNS(null, 'r', this.r);
		circle.setAttributeNS(null, 'fill', this.fill);

		return circle;
	};
	//svg要素の子要素を全て消す;
	ScheduleSvgDrawer.prototype.renewCanvas = function() {
		var child;
		while(child = this.canvas.firstChild) {
			this.canvas.removeChild(child);
		}
	};

	//scheduleを円グラフ化して、その要素が入っているg要素を返す;
	ScheduleSvgDrawer.prototype.createPieChart = function() {
		//g要素を作成;
		var arcGroup = document.createElementNS(this.NS, 'g');
		arcGroup.setAttributeNS(null, 'class', 'arc-group');
		arcGroup.setAttributeNS(null, 'stroke-width', this.strokeWidth);

		//scheduleは円1つで描くか扇形を繋げて描くか;
		if(this.isCircle()) {
			this.currentSchedule = this.formatSchedule[0];
			this.setScheduleDegree();
			this.setBackColor();

			var circle = this.createCircle();
			arcGroup.appendChild(circle);
		}else {
			//扇形の場合、一つ一つのスケジュールを繋げていく;
			for(var i = 0; i < this.formatSchedule.length; i++) {
				this.currentSchedule = this.formatSchedule[i];
				this.setScheduleDegree();
				this.setBackColor();

				var arc = this.createArc();
				arcGroup.appendChild(arc);
			}
		}
		return arcGroup;
	};

	//svgにscheduleを円グラフ化した要素を加え、表示する;
	ScheduleSvgDrawer.prototype.draw = function() {
		//svgをまっさらに;
		this.renewCanvas();
		//円グラフを表示する;
		this.canvas.appendChild(this.createPieChart());
		this.paintLineColor();
	};

	return ScheduleSvgDrawer;
})();

var MainScheduleValue = (function() {
	var MainScheduleValue = function() {
		this.width = 620;
		this.height = 620;
		this.strokeWidth = 5;
		this.r = 250 - this.strokeWidth / 2;
		this.cx = this.width / 2;
		this.cy = this.height / 2;

		this.textR = this.r * 0.8;
		this.fontSize = 12;

		this.clockR = this.r * 1.1;
		this.clockFontSize = this.fontSize * 2;
		this.clockFontColor = SubstituteSchedule.fontColor;
	};

	return new MainScheduleValue();
})();

//メインのスケジュールを表示するクラス;
var MainScheduleDrawer = (function() {
	var MainScheduleDrawer = function(formatSchedule) {
		ScheduleSvgDrawer.call(this, formatSchedule);

		Object.defineProperties(this, {
			canvas: {
				value: ScheduleDisplay.pieChart.querySelector('svg'),
				configurable: true,
			},
			//box-sizing: border-boxは効かないから
			//半径に線幅を加味する;
			//線幅;
			strokeWidth: {value: MainScheduleValue.strokeWidth},
			//半径;
			r: {value: MainScheduleValue.r},
			//中心点のX座標;
			cx: {value: MainScheduleValue.cx},
			//中心点のY座標;
			cy: {value: MainScheduleValue.cy},
			//text描画の半径;
			textR: {value: MainScheduleValue.textR},
			fontSize: {value: MainScheduleValue.fontSize},
			textAnchor: {value: 'middle'},
			//時刻表示部分の半径;
			clockR: {value: MainScheduleValue.clockR},
			clockFontSize: {value: MainScheduleValue.clockFontSize},
			clockFontColor: {value: MainScheduleValue.clockFontColor},
		});
	};

	MainScheduleDrawer.prototype = Object.create(ScheduleSvgDrawer.prototype, {
		constructor: {value: MainScheduleDrawer},
	});



	MainScheduleDrawer.prototype.createText = function() {
		//テキストの座標を決めるための円の中心角.スケジュールの始点と終点の角度の中心の角度になる;
		//例: スケジュールの始点50度、終点70度のときテキストの角度は60度;
		var degree = this.startDegree + (this.finishDegree - this.startDegree) / 2;
		//テキストの座標;
		var textX = this.cx + this.textR * Math.sin(degree / 180 * Math.PI);
		var textY = this.cy - this.textR * Math.cos(degree / 180 * Math.PI);

		var text = document.createElementNS(this.NS, 'text');
		text.textContent = this.text;
		text.setAttributeNS(null, 'x', textX);
		text.setAttributeNS(null, 'y', textY);
		text.setAttributeNS(null, 'fill', this.fontColor);
		text.setAttributeNS(null, 'dominant-baseline', 'middle');

		return text;
	};

	MainScheduleDrawer.prototype.createPieChartText = function() {
		var textGroup = document.createElementNS(this.NS, 'g');
		textGroup.setAttributeNS(null, 'class', 'text-group');
		textGroup.setAttributeNS(null, 'text-anchor', this.textAnchor);
		textGroup.setAttributeNS(null, 'font-size', this.fontSize);
		for(var i = 0; i < this.formatSchedule.length; i++) {
			this.currentSchedule = this.formatSchedule[i];
			this.setScheduleDegree();
			this.setFontColor();
			this.setText();

			textGroup.appendChild(this.createText());
		}

		return textGroup;
	};

	MainScheduleDrawer.prototype.createClockText = function(time) {
		var degree = 360 / 24 * time;
		var textX = this.cx + this.clockR * Math.sin(degree / 180 * Math.PI);
		var textY = this.cy - this.clockR * Math.cos(degree / 180 * Math.PI);

		var text = document.createElementNS(this.NS, 'text');
		text.textContent = time;
		text.setAttributeNS(null, 'x', textX);
		text.setAttributeNS(null, 'y', textY);
		text.setAttributeNS(null, 'dominant-baseline', 'middle');

		return text;
	};

	MainScheduleDrawer.prototype.createClock = function() {
		var clock = document.createElementNS(this.NS, 'g');
		clock.setAttributeNS(null, 'class', 'clock');
		clock.setAttributeNS(null, 'text-anchor', 'middle');
		clock.setAttributeNS(null, 'font-size', this.clockFontSize);
		clock.setAttributeNS(null, 'fill', this.clockFontColor);
		var i = 0;
		while(i < 24) {
			clock.appendChild(this.createClockText(i));
			i += 3;
		}

		return clock;
	}

	MainScheduleDrawer.prototype.draw = function() {
		this.renewCanvas();
		this.canvas.appendChild(this.createPieChart());
		this.canvas.appendChild(this.createPieChartText());
		this.canvas.appendChild(this.createClock());
		this.paintLineColor();
	};

	return MainScheduleDrawer;
})();

var MainScheduleCanvasDrawer = (function() {
	var MainScheduleCanvasDrawer = function(formatSchedule) {
		ScheduleDrawer.call(this, formatSchedule);

		var canvas = document.createElement('canvas');
		//svg要素と同じ(要リファクタリング);
		canvas.setAttribute('width', MainScheduleValue.width * 2);
		canvas.setAttribute('height', MainScheduleValue.height * 2);

		Object.defineProperties(this, {
			canvas: {value: canvas},
			ctx: {value: canvas.getContext('2d')},
			strokeWidth: {value: MainScheduleValue.strokeWidth * 2},
			//半径;
			r: {value: MainScheduleValue.r * 2},
			//中心点のX座標;
			cx: {value: MainScheduleValue.cx * 2},
			//中心点のY座標;
			cy: {value: MainScheduleValue.cy * 2},
			//text描画の半径;
			textR: {value: MainScheduleValue.textR * 2},
			fontSize: {value: MainScheduleValue.fontSize * 2},
			//時刻表示部分の半径;
			clockR: {value: MainScheduleValue.clockR * 2},
			clockFontSize: {value: MainScheduleValue.clockFontSize * 2},
			clockFontColor: {value: MainScheduleValue.clockFontColor * 2},
		});
	};

	MainScheduleCanvasDrawer.prototype = Object.create(ScheduleDrawer.prototype, {
		constructor: {value: MainScheduleCanvasDrawer},
	});

	MainScheduleCanvasDrawer.prototype.drawArc = function() {
		var startRad = (this.startDegree - 90) / 180 * Math.PI;
		var finishRad = (this.finishDegree - 90) / 180 * Math.PI;

		this.ctx.beginPath();
		this.ctx.moveTo(this.cx, this.cy);
		this.ctx.arc(this.cx, this.cy, this.r, startRad, finishRad, false);
		this.ctx.lineTo(this.cx, this.cy);
		this.ctx.lineWidth = this.strokeWidth;
		this.ctx.strokeStyle = this.lineColor;
		this.ctx.fillStyle = this.fill;
		this.ctx.fill();
		this.ctx.stroke();
		this.ctx.closePath();
	};

	MainScheduleCanvasDrawer.prototype.drawCircle = function() {
		this.ctx.beginPath();
		this.ctx.arc(this.cx, this.cy, this.r, 0, 2 * Math.PI, false);
		this.ctx.lineWidth = this.strokeWidth;
		this.ctx.strokeStyle = this.lineColor;
		this.ctx.fillStyle = this.fill;
		this.ctx.fill();
		this.ctx.stroke();
		this.ctx.closePath();
	};

	MainScheduleCanvasDrawer.prototype.drawPieChart = function() {
		if(this.isCircle()) {
			this.currentSchedule = this.formatSchedule[0];
			this.setLineColor();
			this.setBackColor();
			this.drawCircle();
		}else {
			for(var i = 0; i < this.formatSchedule.length; i++) {
				this.currentSchedule = this.formatSchedule[i];

				this.setScheduleDegree();
				this.setLineColor();
				this.setBackColor();

				this.drawArc();
			}
		}
	};

	MainScheduleCanvasDrawer.prototype.drawText = function() {
		//テキストの座標を決めるための円の中心角.スケジュールの始点と終点の角度の中心の角度になる;
		//例: スケジュールの始点50度、終点70度のときテキストの角度は60度;
		var degree = this.startDegree + (this.finishDegree - this.startDegree) / 2;
		//テキストの座標;
		var textX = this.cx + this.textR * Math.sin(degree / 180 * Math.PI);
		var textY = this.cy - this.textR * Math.cos(degree / 180 * Math.PI);

		this.ctx.font = 'normal ' + this.fontSize + 'px ' + 'sans-serif';
		this.ctx.fillStyle = this.fontColor;
		this.ctx.textAlign = 'center';
		this.ctx.textBaseline = 'middle';

		this.ctx.fillText(this.text, textX, textY);
	};

	MainScheduleCanvasDrawer.prototype.drawPieChartText = function() {
		for(var i = 0; i < this.formatSchedule.length; i++) {
			this.currentSchedule = this.formatSchedule[i];

			this.setScheduleDegree();
			this.setFontColor();
			this.setText();

			this.drawText();
		}
	};

	MainScheduleCanvasDrawer.prototype.drawClockText = function(time) {
		var degree = 360 / 24 * time;
		var textX = this.cx + this.clockR * Math.sin(degree / 180 * Math.PI);
		var textY = this.cy - this.clockR * Math.cos(degree / 180 * Math.PI);

		this.ctx.font = 'normal ' + this.clockFontSize + 'px ' + 'sans-serif';
		this.ctx.fillStyle = this.clockFontColor;
		this.ctx.textAlign = 'center';
		this.ctx.textBaseline = 'middle';

		this.ctx.fillText(time, textX, textY);
	};

	MainScheduleCanvasDrawer.prototype.drawClock = function() {
		var i = 0;
		while(i < 24) {
			this.drawClockText(i);
			i += 3;
		}
	};

	MainScheduleCanvasDrawer.prototype.draw = function() {
		this.drawPieChart();
		this.drawPieChartText();
		this.drawClock();
	};

	MainScheduleCanvasDrawer.prototype.getCanvas = function() {
		return this.canvas;
	};

	return MainScheduleCanvasDrawer;
})();

var StorageScheduleDrawer = (function() {
	var StorageScheduleDrawer = function(formatSchedule, canvas) {
		ScheduleSvgDrawer.call(this, formatSchedule);

		var width = 200;
		var height = 200;
		canvas.setAttribute('width', width);
		canvas.setAttribute('height', height);

		Object.defineProperties(this, {
			canvas: {
				value: canvas,
			},
			//円の線;
			strokeWidth: {value: 2},
			//半径((width - stroke) / 2);
			r: {value: 99},
			//中心点のX座標;
			cx: {value: width / 2},
			//中心点のY座標;
			cy: {value: width / 2},
		});
	};

	StorageScheduleDrawer.prototype = Object.create(ScheduleSvgDrawer.prototype, {
		constructor: {value: StorageScheduleDrawer},
	});

	return StorageScheduleDrawer;
})();

var ScheduleWriter = (function() {
	var ScheduleWriter = function(formatSchedule) {
		if(!ScheduleAnalyst.isFormatSchedule(formatSchedule)) {
			throw new TypeError();
		}
		Object.defineProperties(this, {
			formatSchedule: {
				value: formatSchedule,
			},
			currentSchedule: {
				value: null,
				writable: true,
				configurable: true,
			},
			writingArea: {
				value: ScheduleDisplay.writing.querySelector('dl.schedule'),
			},
			borderColor: {
				value: null,
				writable: true,
				configurable: true,
			},
			time: {
				value: null,
				writable: true,
				configurable: true,
			},
			name: {
				value: null,
				writable: true,
				configurable: true,
			},
			detail: {
				value: null,
				writable: true,
				configurable: true,
			},
		});
	};

	ScheduleWriter.prototype.setBorderColor = function() {
		this.borderColor = this.currentSchedule.backColor;
	};
	ScheduleWriter.prototype.setTime = function() {
		var time = ScheduleTime.getTime(this.currentSchedule.startHour, this.currentSchedule.startMinute);
		this.time = time + '～';
	};
	ScheduleWriter.prototype.setName = function() {
		this.name = this.currentSchedule.name;
	};
	ScheduleWriter.prototype.setDetail = function() {
		var detail = this.currentSchedule.detail;
		detail = detail.replace(/\r\n/g, '\n');
		detail = detail.replace(/\r/g, '\n');
		detail = detail.replace(/\n/g, '<br>');
		this.detail = detail;
	};

	ScheduleWriter.prototype.createTimeDT = function() {
		var dt = document.createElement('dt');
		dt.className = 'time';
		dt.style.borderColor = this.borderColor;
		dt.textContent = this.time;
		return dt;
	};

	ScheduleWriter.prototype.createNameDD = function() {
		var dd = document.createElement('dd');
		dd.className = 'name';
		dd.textContent = this.name;
		return dd;
	};

	ScheduleWriter.prototype.createDetailDD = function() {
		var dd = document.createElement('dd');
		dd.className = 'detail';
		dd.innerHTML = this.detail;
		return dd;
	};

	ScheduleWriter.prototype.createDraft = function() {
		var draft = document.createDocumentFragment();
		for(var i = 0; i < this.formatSchedule.length; i++) {
			this.currentSchedule = this.formatSchedule[i];
			this.setTime();
			this.setName();
			this.setDetail();
			this.setBorderColor();

			var div = document.createElement('div');
			div.className = 'time-schedule';

			div.appendChild(this.createTimeDT());
			div.appendChild(this.createNameDD());
			div.appendChild(this.createDetailDD());

			draft.appendChild(div);
		}

		return draft;
	};

	ScheduleWriter.prototype.renewWritingArea = function() {
		var child;
		while(child = this.writingArea.firstChild) {
			this.writingArea.removeChild(child);
		}
	};
	ScheduleWriter.prototype.write = function() {
		this.renewWritingArea();
		this.writingArea.appendChild(this.createDraft());
	};

	return ScheduleWriter;
})();

var ScheduleStorage = (function() {
	var ScheduleStorage = function() {
		var tableName = 'schedules';
		var table = JSON.parse(localStorage.getItem(tableName)) || {};
		var trashes = JSON.parse(localStorage.getItem('trashes')) || {};

		Object.defineProperties(this,{
			table: {value: table},
			trashes: {value: trashes},
		});
	};

	ScheduleStorage.prototype.getKeys = function() {
		return Object.keys(this.table).sort();
	};
	ScheduleStorage.prototype.getTrashKeys = function() {
		return Object.keys(this.trashes);
	};
	ScheduleStorage.prototype.save = function() {
		localStorage.setItem('schedules', JSON.stringify(this.table));
	};
	ScheduleStorage.prototype.throwAwayTrash = function() {
		localStorage.setItem('trashes', JSON.stringify(this.trashes));
	};
	ScheduleStorage.prototype.allRemove = function() {
		for(key in this.table) {
			this.trashes[key] = this.table[key];
			delete this.table[key];
		}

		this.throwAwayTrash();
		this.save();
	};
	ScheduleStorage.prototype.restore = function() {
		for(key in this.trashes) {
			this.table[key] = this.trashes[key];
			delete this.trashes[key];
		}

		this.throwAwayTrash();
		this.save();
	};
	ScheduleStorage.prototype.emptyTrashCan = function() {
		localStorage.removeItem('trashes');
	};


	ScheduleStorage.editing = null;

	ScheduleStorage.isKey = function(key) {
		if(typeof key !== 'string') {
			return false;
		}
		if(!(/^key\d+$/.test(key))) {
			return false;
		}
		return true;
	};

	return ScheduleStorage;
})();

var ScheduleSaver = (function() {
	var ScheduleSaver = function(daySchedule) {
		if(!Scheduler.isDaySchedule(daySchedule)) {
			throw new TypeError();
		}

		ScheduleStorage.call(this, null);
		Object.defineProperty(this, 'daySchedule', {value: daySchedule});
	};

	ScheduleSaver.prototype = Object.create(ScheduleStorage.prototype, {
		constructor: {value: ScheduleSaver},
	});

	ScheduleSaver.prototype.add = function() {
		var time = new Date().getTime();
		var key = 'key' + time;
		this.table[key] = {
			data: this.daySchedule,
			created: time,
			update: time,
		};

		this.save();

		ScheduleStorage.editing = key;
		return key;
	};

	ScheduleSaver.prototype.overwrite = function() {
		var key = ScheduleStorage.editing;
		if(key === null) {
			return null;
		}
		if(!(key in this.table)) {
			ScheduleStorage.editing = null;
			return null;
		}
		var time = new Date().getTime();
		this.table[key].data = this.daySchedule;
		this.table[key].update = time;
		this.save();

		return key;
	};

	return ScheduleSaver;
})();

var StorageEditor = (function() {
	var StorageEditor = function(key) {
		if(!ScheduleStorage.isKey(key)) {
			throw new TypeError();
		}

		ScheduleStorage.call(this, null);
		Object.defineProperty(this, 'key', {value: key});
	};

	StorageEditor.prototype = Object.create(ScheduleStorage.prototype, {
		constructor: {value: StorageEditor},
	});

	StorageEditor.prototype.load = function() {
		return clone(this.table[this.key].data);
	};

	//今の段階ではlocalから完全削除;
	//サーバーと連携できるようになった段階で変更する;
	StorageEditor.prototype.remove = function() {
		this.trashes[this.key] = this.table[this.key];
		delete this.table[this.key];

		this.throwAwayTrash();
		this.save();

		return this.key;
	};

	StorageEditor.prototype.restore = function() {
		this.table[this.key] = this.trashes[this.key];
		delete this.trashes[this.key];

		this.throwAwayTrash();
		this.save();

		return this.key;
	};

	return StorageEditor;
})();

var StorageDisplay = (function() {
	var StorageDisplay = function() {
		Object.defineProperties(this, {
			area: {value: StorageDisplay.element},
		});
	};

	StorageDisplay.prototype.display = function() {
		var keys = new ScheduleStorage().getKeys();
		for(var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var storageScheduleDisplayCreator = new StorageScheduleDisplayCreator(key);
			var div = storageScheduleDisplayCreator.create();

			this.area.appendChild(div);
		}
	};

	StorageDisplay.prototype.add = function(key) {
		if(!ScheduleStorage.isKey(key)) {
			return;
		}

		var storageScheduleDisplayCreator = new StorageScheduleDisplayCreator(key);
		this.area.appendChild(storageScheduleDisplayCreator.create());
	};

	StorageDisplay.prototype.overwrite = function(key) {
		if(!ScheduleStorage.isKey(key)) {
			return;
		}

		var storageScheduleDisplayCreator = new StorageScheduleDisplayCreator(key);
		storageScheduleDisplayCreator.overwrite();
	};

	StorageDisplay.prototype.allRemove = function() {
		var keys = new ScheduleStorage().getKeys();
		for(var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var storageScheduleDisplayCreator = new StorageScheduleDisplayCreator(key);
			storageScheduleDisplayCreator.removeListener();
		}
	};
	StorageDisplay.prototype.allUndo = function() {
		var keys = new ScheduleStorage().getTrashKeys();
		for(var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var storageScheduleDisplayCreator = new StorageScheduleDisplayCreator(key);
			storageScheduleDisplayCreator.restoreListener();
		}
	};

	var storageDisplayArea = document.getElementById('storage-display-area');

	Object.defineProperties(StorageDisplay, {
		element: {
			value: storageDisplayArea,
		},
	});

	return StorageDisplay;
})();

var StorageScheduleDisplayCreator = (function() {
	var StorageScheduleDisplayCreator = function(key) {
		if(!ScheduleStorage.isKey(key)) {
			throw new TypeError();
		}

		var div = document.getElementById(key);
		if(div === null) {
			div = document.createElement('div');
			div.id = key;
			div.className = 'storage-schedule';
		}

		Object.defineProperties(this, {
			key: {value: key},
			container: {value: div},
		});
	};

	StorageScheduleDisplayCreator.prototype.createTitle = function() {
		var title = document.createElement('p');
		title.className = 'title';
		var storageEditor = new StorageEditor(this.key);
		title.textContent = storageEditor.load().title;

		return title;
	};

	StorageScheduleDisplayCreator.prototype.createPieChart = function() {
		var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		svg.setAttribute('class', 'pie-chart');

		var storageEditor = new StorageEditor(this.key);
		var scheduleExcludingDetailAnalyst = new ScheduleExcludingDetailAnalyst(storageEditor.load());
		var formatSchedule = scheduleExcludingDetailAnalyst.shaping();
		var storageScheduleDrawer = new StorageScheduleDrawer(formatSchedule, svg);
		storageScheduleDrawer.draw();

		return svg;
	};

	StorageScheduleDisplayCreator.prototype.createEditButton = function() {
		var button = document.createElement('input');
		button.setAttribute('type', 'button');
		button.setAttribute('name', 'edit');
		button.setAttribute('value', '編集');

		var editButton = new EditButton(button);
		editButton.addClickListener(this.editListener.bind(this));

		return button;
	};

	StorageScheduleDisplayCreator.prototype.editListener = function() {
		SchedulingForm.init();

		var daySchedule = new StorageEditor(this.key).load();
		var scheduler = new Scheduler(daySchedule);
		var scheduleDisplay = new ScheduleDisplay(daySchedule);
		var schedulingForm = new SchedulingForm();

		schedulingForm.setEventListener(scheduler);
		scheduleDisplay.displaySchedule();
		scheduleDisplay.changeTitle();

		SchedulingForm.setStartPoint({hour: daySchedule.startPointHour, minute: ScheduleTime.fixMinute(daySchedule.startPointMinute)});
		ScheduleStorage.editing = this.key;
	}

	StorageScheduleDisplayCreator.prototype.createRemoveButton = function() {
		var button = document.createElement('input');
		button.setAttribute('type', 'button');
		button.setAttribute('name', 'remove');
		button.setAttribute('value', '削除');

		var removeButton = new RemoveButton(button);
		removeButton.addClickListener(this.removeListener.bind(this));

		return button;
	};

	StorageScheduleDisplayCreator.prototype.removeListener = function() {
		var storageEditor = new StorageEditor(this.key);
		storageEditor.remove();

		removeChildren(this.container);

		this.container.appendChild(this.createRestoreButton());
	}

	StorageScheduleDisplayCreator.prototype.createRestoreButton = function() {
		var button = document.createElement('input');
		button.setAttribute('type', 'button');
		button.setAttribute('name', 'restore');
		button.setAttribute('value', '元に戻す');

		var restoreButton = new RestoreButton(button);
		restoreButton.addClickListener(this.restoreListener.bind(this));

		return button;
	};

	StorageScheduleDisplayCreator.prototype.restoreListener = function() {
		var storageEditor = new StorageEditor(this.key);
		storageEditor.restore();

		this.overwrite();
	}

	StorageScheduleDisplayCreator.prototype.overwrite = function() {
		removeChildren(this.container);
		return this.create();
	};


	StorageScheduleDisplayCreator.prototype.create = function() {
		this.container.appendChild(this.createTitle());
		this.container.appendChild(this.createPieChart());
		this.container.appendChild(this.createEditButton());
		this.container.appendChild(this.createRemoveButton());

		return this.container;
	};

	return StorageScheduleDisplayCreator;
})();


var CanvasDownloader = (function() {
	var CanvasDownloader = function(canvas) {
		Object.defineProperties(this, {
			canvas: {value: canvas},
		});
	};

	CanvasDownloader.prototype.getBlob = function() {
		var dataURL = this.canvas.toDataURL();
		var binary = atob(dataURL.split(',')[1]);
		var buffer = new Uint8Array(binary.length);
		for(var i = 0, len = binary.length; i < len; i++) {
			buffer[i] = binary.charCodeAt(i);
		}

		return new Blob([buffer.buffer], {type: 'image/png'});
	};

	CanvasDownloader.prototype.download = function() {
		var title = new ScheduleTitle().getTitle();

		var blob = this.getBlob();
		//IEか否か;
		if(window.navigator.msSaveOrOpenBlob) {
			//IEの処理;
			window.navigator.msSaveOrOpenBlob(blob, title + '.png');
		}else {
			//blobのURLを作成;
			var url = window.URL.createObjectURL(blob);
			var a = document.createElement('a');
			a.href = url;
			a.download = title;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			//破棄;
			window.URL.revokeObjectURL(blob);
		}
	};

	return CanvasDownloader;
})();


function typeOf(operand) {
	return Object.prototype.toString.call(operand).slice(8, -1);
}
var clone = (function() {
	function createMemo() {
		return {
			'Object': [],
			'Array' : [],
			'Function': [],
			'Error': [],
			'Date': [],
			'RegExp': [],
			'Boolean': [],
			'String': [],
			'Number': [],
		};
	}
	//循環参照対策のため、すべてオブジェクトをmemoに保存;
	var memo = createMemo();
	//main関数 第一引数はcloneしたいobject 第二引数はcloneしたくないobjectのconstructorを配列で指定する;
	function clone(object, prototypes) {
		//プリミティブ型はそのまま返す;
		if(object === null || (typeof object !== 'object' && typeof object !== 'function')) {
			return object;
		}
		//cloneしたくないobjectであれば、参照で返す;
		if(typeOf(prototypes) === 'Array'){
			for(var i = 0, len = prototypes.length; i < len; i++) {
				if(Object.getPrototypeOf(object) === prototypes[i]) {
					return object;
				}
			}
		}
		//Nodeオブジェクトは自作関数cloneNodeに処理を任せる;
		if(object instanceof Node){
			return cloneNode(object);
		}
		//objectの型とcloneObjの型を同一にする;
		var cloneObj;
		var type = typeOf(object);
		switch(type) {
			case 'Object':
				//自作クラスはprototype継承される
				cloneObj = Object.create(Object.getPrototypeOf(object));
				break;
			case 'Array':
				cloneObj = [];
				break;
			case 'Function':
				//ネイティブ関数オブジェクトはcloneできないので、そのまま参照で返す;
				try {
					eval("cloneObj = " + object.toString());
				}catch(e) {
					return object;
				}
				break;
			case 'Error':
				cloneObj = new Object.getPrototypeOf(object).constructor();
			case 'Date':
				cloneObj = new Date(object.valueOf());
				break;
			case 'RegExp':
				cloneObj = new RegExp(object.valueOf());
				break;
			case 'Boolean':
			case 'String':
			case 'Number':
				cloneObj = new Object(object.valueOf());
				break;
			default:
				//ここで列挙されていない型は対応していないので、参照で返す;
				return object;
		}
		//循環参照対策 objectが既にmemoに保存されていれば内部参照なので、値渡しではなくcloneObjに参照先を切り替えたobjectを返す;
		for(var i = 0, len = memo[type].length; i < len; i++) {
			if(memo[type][i][0] === object) {
				return memo[type][i][1];
			}
		}
		//循環参照対策 objectはcloneObjとセットでmemoに追加;
		memo[type].push([object, cloneObj]);

		//objectのすべてのプロパティを再帰的にcloneする;
		var properties = Object.getOwnPropertyNames(object);
		for(var i = 0, len = properties.length; i < len; i++) {
			var prop = properties[i];
			cloneObj[prop] = clone(object[prop], prototypes);
		}
		//cloneしたオブジェクトを返す;
		return cloneObj;
	}
	function typeOf(operand) {
		return Object.prototype.toString.call(operand).slice(8, -1);
	}
	function cloneNode(node) {
		//script要素は再評価するためにcloneScriptでcloneする;
		if(node.tagName === 'SCRIPT') {
			return cloneScript(node);
		}
		//cloneNodeで要素をcloneする;
		var clone = node.cloneNode();
		//子要素があれば再帰的に追加;
		if(node.firstChild) {
			var childNodes = node.childNodes;
			for(var i = 0, len = childNodes.length; i < len; i++) {
				clone.appendChild(cloneNode(childNodes[i]));
			}
		}
		return clone;
	}
	function cloneScript(element) {
		var script = document.createElement('script');
		var attrs = element.attributes;
		for(var i = 0, len = attrs.length; i < len; i++) {
			var attr = attrs[i];
			script.setAttribute(attr.name, attr.value);
		}
		script.innerHTML = element.innerHTML;
		return script;
	}

	return function(object, prototypes) {
		memo = createMemo();
		return clone(object, prototypes);
	}
})();

function removeChildren(element) {
	var child;
	while(child = element.firstChild) {
		element.removeChild(child);
	}
}

//正当なcolorコードか真偽を返す;
function isColor(colorCode) {
	var reg = new RegExp(/^#([\da-fA-F]{6}|[\da-fA-F]{3})$/);
	return reg.test(colorCode);
}



(function main() {
	new ScheduleStorage().emptyTrashCan();

	var scheduler = new Scheduler();
	schedulingForm = new SchedulingForm();
	schedulingForm.setEventListener(scheduler);

	var scheduleDisplay = new ScheduleDisplay(scheduler.getDaySchedule());
	var storageDisplay = new StorageDisplay();
	scheduleDisplay.changeTitle();
	scheduleDisplay.displaySchedule();
	storageDisplay.display();

	var colorFormElements = document.querySelectorAll('input[type="color"]');
	for(var i = 0; i < colorFormElements.length; i++) {
		new ColorForm(colorFormElements[i]).addFocusListener();
	}
	var hourFormElements = document.querySelectorAll('input[name="hour"]');
	for(var i = 0; i < hourFormElements.length; i++) {
		new ScheduleHourForm(hourFormElements[i]).addFocusListener();
	}
	var minuteFormElements = document.querySelectorAll('input[name="minute"]');
	for(var i = 0; i < minuteFormElements.length; i++) {
		new ScheduleMinuteForm(minuteFormElements[i]).addFocusListener();
	}
})();