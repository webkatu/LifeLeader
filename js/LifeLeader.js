(function() {

//各ブラウザのmousewheelイベント統一する;
var mousewheel = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';

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
//イベントリスナーを管理するクラス;
//イベントを定義したり削除したりする;
//イベント定義時は基本的にHandlerクラスを使って定義する;
//引数にEventTargetになりうるものを指定する;
//一つのHandlerインスタンスに一つのEventTarget;
var Handler = (function() {
	var Handler = function(target) {
		/*
		IEは対応していない;
		if(!(target instanceof EventTarget)) {
			throw new TypeError();
		}
		*/

		//定義したイベントを格納する配列;
		var events = [];
		//定義したイベントを得る時のkey;
		this.key = null;
		//events配列を値渡しで返す;
		this.getEvents = function() {
			return clone(events);
		};
		//イベントを定義するメソッド;
		//定義したイベントを格納した配列のkeyを返す;
		this.addListener = function(type, listener, capture) {
			target.addEventListener(type, listener, capture);
			this.key = events.length;
			events[events.length] = {
				//target: taget,
				type: type,
				listener: listener,
				capture: capture,
			};

			return this.key;
		};
		//定義したイベントを消すメソッド;
		//引数にkeyを取る;
		//要リファクタリング(引数を必要とせずthis.keyで管理できることが理想);
		this.removeListener = function(key) {
			if(key in events) {
				var e = events[key];
				target.removeEventListener(e.type, e.listener, e.capture);
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

//履歴を扱う時に使うデーター構造クラス;
var HistoryManager = (function() {
	var HistoryManager = function() {
		//履歴リスト;
		this.history = [];
		//やり直しリスト;
		this.redoList = [];
	};

	//履歴の最後を値渡しで返す;
	HistoryManager.prototype.getEnd = function() {
		return clone(this.history[this.history.length - 1]);
	};
	//履歴に引数のdataを追加する;
	HistoryManager.prototype.add = function(data) {
		this.history.push(data);
		this.redoList.length = 0;
		return this;
	};
	//履歴を戻ることが出来るか真偽値を返す;
	HistoryManager.prototype.undoes = function() {
		return this.history.length > 1;
	};
	//戻ったのをやり直しできるか真偽値を返す;
	HistoryManager.prototype.redoes = function() {
		return this.redoList.length > 0;
	};
	//履歴の一つ前に戻る;
	HistoryManager.prototype.undo = function() {
		if(this.undoes()) {
			this.redoList.push(this.history.pop());
		}
		return this.getEnd();
	};
	//戻ったのをやり直す;
	HistoryManager.prototype.redo = function() {
		if(this.redoes()) {
			this.history.push(this.redoList.pop());
		}
		return this.getEnd();
	};

	return HistoryManager;
})();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//スケジュール作成はユーザーが入力した値をSchedulerクラスが処理する;
//Schedulerはユーザーが入力した値をdayScheduleに収める;


//スケジュール作成時の基本的な値;
//ユーザーが指定しなければこの値が代替に使われる;
var DefaultSchedulingValue = {
	title: 'No title',
	name: '未定',
	detail: '',
	backColor: '#fdf7e2',
	fontColor: '#6d5450',
	lineColor: '#6d5450',
	startPointHour: null,
	startPointMinute: null,
};

//スケジュール表作成フォームのクラス;
var SchedulingForm = (function() {
	var SchedulingForm = function() {
		Object.defineProperties(this, {
			//ユーザーがフォームに入力した値を履歴で管理するプロパティ;
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

	//フォームの内容を一つ前に戻る;
	SchedulingForm.prototype.undo = function() {
		if(!this.historyManager.undoes()) {
			return;
		}
		SchedulingForm.setValue(this.historyManager.undo());
	};

	//戻ったのをやり直す;
	SchedulingForm.prototype.redo = function() {
		if(!this.historyManager.redoes()) {
			return;
		}
		SchedulingForm.setValue(this.historyManager.redo());
	};

	//フォーム内の各elementsのイベントは基本的にここで定義する;
	SchedulingForm.prototype.setEventListener = function(scheduler) {
		if(!(scheduler instanceof Scheduler)) {
			throw new TypeError();
		}

		//titleフォームのonchangeイベント;
		this.title.addChangeListener(function() {
			//schedulerに内容を渡す;
			scheduler.setTitle(new ScheduleTitle());
			//画面に内容を表示;
			new ScheduleDisplay(scheduler.getDaySchedule()).changeTitle();
		});
		eventController.push(this.title);

		//lineColorフォームのonchangeイベント;
		this.lineColor.addChangeListener(function() {
			scheduler.setLineColor(new ScheduleLineColor());
			new ScheduleDisplay(scheduler.getDaySchedule()).changeLineColor();
		});
		eventController.push(this.lineColor);

		//startPointのonchangeイベント;
		this.startPoint.addChangeListener(function() {
			scheduler.setStartPoint(new ScheduleStartPoint());
			new ScheduleDisplay(scheduler.getDaySchedule()).changeStartPoint();
		});
		eventController.push(this.startPoint);

		//addButtonのonclickイベント;
		this.addButton.addClickListener(function() {
			//スケジュール作成データをスケジュール管理者に渡す;
			scheduler.add(new SchedulingData());
			//スケジュール管理者からdayScheduleを取得してそれを画面に表示;
			new ScheduleDisplay(scheduler.getDaySchedule()).displaySchedule();
			//履歴管理オブジェクトにフォーム内容を追加;
			this.historyManager.add(SchedulingForm.getValue());
		}.bind(this));
		eventController.push(this.addButton);

		//undoButtonのonclickイベント;
		this.undoButton.addClickListener(function() {
			//一つ前のスケジュールに書き換える;
			scheduler.undo();
			//スケジュール管理者からdayScheduleを取得してそれを画面に表示;
			new ScheduleDisplay(scheduler.getDaySchedule()).displaySchedule();
			//フォーム内容も一つ前に戻す;
			this.undo();
		}.bind(this));
		eventController.push(this.undoButton);

		//redoButtonのonclickイベント;
		//undoしたのをやり直す;
		this.redoButton.addClickListener(function() {
			scheduler.redo();
			new ScheduleDisplay(scheduler.getDaySchedule()).displaySchedule();
			this.redo();
		}.bind(this));
		eventController.push(this.redoButton);

		//saveButtonのonclickイベント;
		this.saveButton.addClickListener(function() {
			//スケジュールをストレージに保存する;
			var saver = new ScheduleSaver(scheduler.getDaySchedule());
			var key = saver.add();
			//ストレージ表示エリアに保存したスケジュールを表示;
			new StorageDisplay().add(key);
		});
		eventController.push(this.saveButton);

		//overwriteButtonのonclickイベント;
		this.overwriteButton.addClickListener(function() {
			//スケジュールをストレージに上書き保存する;
			var saver = new ScheduleSaver(scheduler.getDaySchedule());
			var key = saver.overwrite();
			//ストレージ表示エリアに保存したスケジュールを上書きして表示;
			new StorageDisplay().overwrite(key);
		});
		eventController.push(this.overwriteButton);

		//resetButtonのonclickイベント;
		this.resetButton.addClickListener(function() {
			//スケジュール作成フォームにデフォルト値をセット;
			SchedulingForm.setDefaultValue();
			//フォームの値を履歴に追加;
			this.historyManager.add(SchedulingForm.getValue());

			//スケジュール管理者がdayScheduleを初期化する;
			scheduler.init();
			//初期化したdayScheduleを画面に表示;
			var scheduleDisplay = new ScheduleDisplay(scheduler.getDaySchedule());
			scheduleDisplay.displaySchedule();
			scheduleDisplay.changeTitle();
		}.bind(this));
		eventController.push(this.resetButton);

		//allRemoveButtonのonclickイベント;
		this.allRemoveButton.addClickListener(function() {
			//ストレージ表示エリアを消す(ストレージからもスケジュールを消している);
			new StorageDisplay().allRemove();
			//リストアボタンを表示させる;
			SchedulingForm.allRemoveButton.classList.add('display-none');
			SchedulingForm.allRestoreButton.classList.remove('display-none');
		});
		eventController.push(this.allRemoveButton);

		//allRestoreButtonのonclickイベント;
		//削除したスケジュールを全て復旧する;
		this.allRestoreButton.addClickListener(function() {
			new StorageDisplay().allUndo();
			SchedulingForm.allRemoveButton.classList.remove('display-none');
			SchedulingForm.allRestoreButton.classList.add('display-none');
		});
		eventController.push(this.allRestoreButton);

		//画像ダウンロードボタンのonclickイベント;
		this.imageDownloadButton.addClickListener(function() {
			//formatScheduleに変換して、canvasで描き、canvasDownloaderでダウンロードする;
			var scheduleAnalyst = new ScheduleExcludingDetailAnalyst(scheduler.getDaySchedule());
			var canvasDrawer = new MainScheduleCanvasDrawer(scheduleAnalyst.shaping());
			canvasDrawer.draw();
			var canvasDownloader = new CanvasDownloader(canvasDrawer.getCanvas());
			canvasDownloader.download(new ScheduleTitle().getTitle());
		});
		eventController.push(this.imageDownloadButton);

	};

	//要リファクタリング(各フォームのイベントを消す時はこのメソッドを使うのが理想);
	SchedulingForm.prototype.removeEventListener = function() {};


	//各フォームのイベントを管理するオブジェクト;
	//基本的にイベントをまとめて消すために使う;
	//要リファクタリング(上のremoveEventListenerメソッドで消したいイベントを個別に書けばこのオブジェクトはいらない);
	var eventController = new Object();
	eventController.events = [];
	//イベントを消す時は各フォームクラスのremoveAllListenerメソッドを使って消す;
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


	//スケジュール作成フォームのelements;
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

	//elementsはSchedulingFormのstaticなプロパティとして定義;
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

	//各フォームの値を取得する;
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

	//各フォームに値をセット;
	//title lineColorとstartPointを除く;
	//履歴移動時に使う;
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
	SchedulingForm.setTitle = function(title) {
		SchedulingForm.title.value = title;
	};
	SchedulingForm.setLineColor = function(color) {
		SchedulingForm.lineColor.value = color;
	};
	SchedulingForm.setStartPoint = function(time) {
		SchedulingForm.startPointHour.value = time.hour;
		SchedulingForm.startPointMinute.value = time.minute;
	};

	//各フォームの値をリセット;
	SchedulingForm.setDefaultValue = function() {
		SchedulingForm.title.value = '';
		SchedulingForm.scheduleName.value = '';
		SchedulingForm.detail.value = '';
		SchedulingForm.startHour.value = '0';
		SchedulingForm.startMinute.value = '0';
		SchedulingForm.finishHour.value = '0';
		SchedulingForm.finishMinute.value = '0';
		SchedulingForm.backColor.value = DefaultSchedulingValue.backColor;
		SchedulingForm.fontColor.value = DefaultSchedulingValue.fontColor;
		SchedulingForm.lineColor.value = DefaultSchedulingValue.lineColor;
		SchedulingForm.startPointHour.value = null;
		SchedulingForm.startPointMinute.value = null;
	};

	//スケジュール作成フォームを初期化;
	//各フォームのイベントは削除され、各フォームの値はリセットされる;
	SchedulingForm.init = function() {
		eventController.removeEvents();
		SchedulingForm.setDefaultValue();
		SchedulingForm.allRemoveButton.classList.remove('display-none');
		SchedulingForm.allRestoreButton.classList.add('display-none');
	};

	return SchedulingForm;
})();

//以下、各フォームのクラス;
//要リファクタリング(抽象度が中途半端なことになっているので具体的にFormとしてクラスを作り直す);

//スケジュール表のタイトルを管理するクラス;
var ScheduleTitle = (function() {
	var ScheduleTitle = function() {
		//インスタンス生成時にtitleフォームのvalueを取得する;
		var title = SchedulingForm.title.value;
		if(!ScheduleTitle.isTitle(title)) {
			//フォームが空なら代替値を代入;
			title = DefaultSchedulingValue.title;
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

//個々のスケジュールの内容を管理するクラス;
//スケジュールの内容とはスケジュール名とその補足;
//親クラス;
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

//個々のスケジュール名を管理するクラス;
//ScheduleContentクラスを継承する;
var ScheduleName = (function() {
	var ScheduleName = function(name) {
		//スケジュール名は引数;
		//引数が無ければnameフォームのvalue;
		//フォームが空なら代替値;
		if(typeof name === 'undefined') {
			name = SchedulingForm.scheduleName.value;
		}
		if(!ScheduleContent.isValue(name)) {
			name = DefaultSchedulingValue.name;
		}
		ScheduleContent.call(this, name);
	};

	ScheduleName.prototype = Object.create(ScheduleContent.prototype, {
		constructor: {value: ScheduleName},
	});

	return ScheduleName;
})();

//個々のスケジュールの補足を管理するクラス;
//ScheduleContentクラスを継承する;
var ScheduleDetail = (function() {
	var ScheduleDetail = function(detail) {
		//補足は引数;
		//引数が無ければdetailフォームのvalue;
		//フォームが空なら代替値;
		if(typeof detail === 'undefined') {
			detail = SchedulingForm.detail.value;
		}
		if(!ScheduleContent.isValue(detail)) {
			value = DefaultSchedulingValue.detail;
		}
		ScheduleContent.call(this, detail);
	};

	ScheduleDetail.prototype = Object.create(ScheduleContent.prototype, {
		constructor: {value: ScheduleDetail},
	});

	return ScheduleDetail;
})();

//スケジュールの時間を管理するクラス;
//hourとminuteを引数に取る;
//親クラス;
var ScheduleTime = (function() {
	var ScheduleTime = function(hour, minute) {
		//引数が不正ならエラーを返す;
		if(!ScheduleTime.isTime(hour) || !ScheduleTime.isTime(minute)) {
			throw new TypeError();
		}

		//引数のhourとminuteを処理しやすい数値に直してからプロパティに代入する;
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
	//返り値0は引数minuteが15未満の時, 1は15~30未満, 2は30~45未満, 3は45以上;
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

	//引数が時間として表すことができる値か真偽値を返す;
	ScheduleTime.isTime = function(time) {
		return typeof time === 'number' && isFinite(time);
	};

	//0:00, などデジタル表示のような文字列を返す;
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

//スケジュールの始まる時間を管理するクラス;
//ScheduleTimeクラスを継承する;
var ScheduleStartTime = (function() {
	var ScheduleStartTime = function() {
		//hourはstartHourフォームのvalue, 空なら0;
		//minuteも同様;
		var hour = Number(SchedulingForm.startHour.value) || 0;
		var minute = Number(SchedulingForm.startMinute.value) || 0;
		ScheduleTime.call(this, hour, minute);
	};

	ScheduleStartTime.prototype = Object.create(ScheduleTime.prototype, {
		constructor: {value: ScheduleStartTime},
	});

	return ScheduleStartTime;
})();

//スケジュールの終わる時間を管理するクラス;
//ScheduleTimeクラスを継承する;
var ScheduleFinishTime = (function() {
	var ScheduleFinishTime = function() {
		//hourはfinishHourフォームのvalue, 空なら0;
		//minuteも同様;
		var hour = Number(SchedulingForm.finishHour.value) || 0;
		var minute = Number(SchedulingForm.finishMinute.value) || 0;
		ScheduleTime.call(this, hour, minute);
	};

	ScheduleFinishTime.prototype = Object.create(ScheduleTime.prototype, {
		constructor: {value: ScheduleFinishTime},
	});

	return ScheduleFinishTime;
})();

//スケジュールの色を管理するクラス;
//親クラス;
var ScheduleColor = (function() {
	var ScheduleColor = function(color) {
		Object.defineProperty(this, 'color', {value: color});
	};
	
	//カラーコードでない文字列ならnullを返す;
	ScheduleColor.prototype.getColor = function() {
		return this.color;
	};

	return ScheduleColor;
})();

//スケジュールの背景色を管理するクラス;
//ScheduleColorを継承する;
var ScheduleBackColor = (function() {
	var ScheduleBackColor = function(color) {
		//引数があれば引数、なければbackColorフォームのvalueを取得する;
		//取得した値がカラーコードでないならcolorに代替値を代入;
		if(typeof color === 'undefined') {
			color = SchedulingForm.backColor.value;
		}
		if(!Color.isColor(color)) {
			color = DefaultSchedulingValue.backColor;
		}
		ScheduleColor.call(this, color);
	};

	ScheduleBackColor.prototype = Object.create(ScheduleColor.prototype, {
		constructor: {value: ScheduleBackColor},
	});

	return ScheduleBackColor;
})();

//スケジュールの文字色を管理するクラス;
//ScheduleColorを継承する;
var ScheduleFontColor = (function() {
	var ScheduleFontColor = function(color) {
		//引数があれば引数、なければfontColorフォームのvalueを取得する;
		//取得した値がカラーコードでないならcolorに代替値を代入;
		if(typeof color === 'undefined') {
			color = SchedulingForm.fontColor.value;
		}
		if(!Color.isColor(color)) {
			color = DefaultSchedulingValue.fontColor;
		}
		ScheduleColor.call(this, color);
	};

	ScheduleFontColor.prototype = Object.create(ScheduleColor.prototype, {
		constructor: {value: ScheduleFontColor},
	});

	return ScheduleFontColor;
})();

//スケジュール表の線の色を管理するクラス;
//ScheduleColorを継承する;
//線の色はスケジュール表全体に適用されるため、背景色や文字色と少し違う;
var ScheduleLineColor = (function() {
	var ScheduleLineColor = function() {
		//lineColorフォームのvalue, なければ代替値をcolorに代入;
		var color = SchedulingForm.lineColor.value;
		if(!Color.isColor(color)) {
			color = DefaultSchedulingValue.lineColor;
		}
		ScheduleColor.call(this, color);
		Object.defineProperty(this, 'handler', {value: new Handler(SchedulingForm.lineColor)});
	};

	ScheduleLineColor.prototype = Object.create(ScheduleColor.prototype, {
		constructor: {value: ScheduleLineColor},
	});

	//lineColorフォームが変更された時のリスナーを登録するためのメソッド;
	ScheduleLineColor.prototype.addChangeListener = function(listener) {
		return this.handler.addListener('change', listener, false);
	};

	//handlerオブジェクトのremoveAllListenerメソッドを呼び出して定義したリスナーを全て消す;
	ScheduleLineColor.prototype.removeAllListener = function() {
		this.handler.removeAllListener();
	}

	return ScheduleLineColor;
})();

//スケジュール作成ボタンを管理するクラス;
//親クラス;
var SchedulingButton = (function() {
	var SchedulingButton = function(button) {
		//引数が要素でないならエラー;
		if(!button instanceof Element) {
			throw new TypeError();
		}
		Object.defineProperties(this, {
			button: {value: button},
			handler: {value: new Handler(button)},
		});
	};

	//clickイベントのリスナーを登録するためのメソッド;
	SchedulingButton.prototype.addClickListener = function(listener) {
		return this.handler.addListener('click', listener, false);
	};
	SchedulingButton.prototype.removeAllListener = function() {
		this.handler.removeAllListener();
	};

	return SchedulingButton;
})();

//以下各ボタンのクラス;
//SchedulingButtonを継承する;
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

//スケジュール表の始点を管理するクラス;
//表示に影響する;
var ScheduleStartPoint = (function() {
	var ScheduleStartPoint = function(time/*Object*/) {
		var hour, minute;
		//引数があれば引数の値、なければフォームの値を代入;
		if(typeOf(time) === 'Object') {
			hour = time.hour;
			minute = time.minute;
		}else {
			hour = SchedulingForm.startPointHour.value;
			minute = SchedulingForm.startPointMinute.value;
		}

		//値が不正であればnull、適正であれば処理しやすい値に直す;
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

	//hourとminuteのフォームのchangeイベントのリスナーを定義するためのメソッド;
	//hourとminuteのフォームは同じリスナーが定義される;
	ScheduleStartPoint.prototype.addChangeListener = function(listener) {
		this.handlerOfHour.addListener('change', listener, false);
		this.handlerOfMinute.addListener('change', listener, false);
	};

	//hourとminuteのフォームのmousewheelイベントのリスナーを定義するためのメソッド;
	//hourとminuteのフォームは同じリスナーが定義される;
	ScheduleStartPoint.prototype.addMousewheelListener = function(listener) {
		this.handlerOfHour.addListener(mousewheel, listener, false);
		this.handlerOfMinute.addListener(mousewheel, listener, false);
	};
	ScheduleStartPoint.prototype.removeAllListener = function() {
		this.handlerOfHour.removeAllListener();
		this.handlerOfMinute.removeAllListener();
	};

	return ScheduleStartPoint;
})();

//ここまで、各スケジュール作成フォームのクラス

//スケジュール作成するための情報を管理するクラス;
//スケジュール作成するための必要なデータをプロパティにもつ;
var SchedulingData = (function() {
	//引数にオブジェクトでスケジュール作成データを指定できる;
	var SchedulingData = function(obj) {
		if(typeof obj === null || typeof obj !== 'object') {
			obj = {};
		}
		//必要なデータを管理する各々のクラスをインスタンス化する;
		var scheduleName = new ScheduleName(obj.name);
		var scheduleDetail = new ScheduleDetail(obj.detail);
		var scheduleStartTime = new ScheduleStartTime(obj.startHour, obj.startMinute);
		var scheduleFinishTime = new ScheduleFinishTime(obj.finishHour, obj.finishMinute);
		var scheduleBackColor = new ScheduleBackColor(obj.backColor);
		var scheduleFontColor = new ScheduleFontColor(obj.fontColor);

		//各々のインスタンスから必要なデータを取得し、それをプロパティに代入;
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

	//スケジュール作成データの中の時間(startTimeとfinishTime)は0時をまたがっているかの真偽値を返す;
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

//全体のスケジュールを作成するクラス;
//スケジュール表を構成するためのデータdayScheduleを持つ;
//スケジュール作成のデータを管理してる個々のクラス(またはSchedulingDataクラス)からデータを受け取り、dayscheduleに追加し、一日のscheduleを作成していく;
var Scheduler = (function() {
	//引数にdayScheduleを指定できる;
	var Scheduler = function(daySchedule) {
		//作成中のdayScheduleの履歴を管理するためHistoryManagerをインスタンス化する;
		var history = new HistoryManager();

		//一日のスケジュールには直接関係ないが、スケジュール表に関係するデータを持つオブジェクト;
		//最終的にadditionInfoのオブジェクトのプロパティは全てdayScheduleのプロパティになる;
		//履歴に保存する必要のないデータを持つためdayScheduleとは内部的に分けられ;
		//外部からdayScheduleを参照する時に値を全てdayScheduleに渡す;
		var additionInfo = new Object();

		//SchedulingDataをインスタンス化した時に使う変数;
		var schedulingData = null;

		//初期化処理;
		this.init = function() {
			//dayScheduleの構造を初期化;
			//dayScheduleの構造 => daySchedule[hour][minute].prop
			daySchedule = {};
			for(var hour = 0; hour < 24; hour++) {
				daySchedule[hour] = [];
				for(var minute = 0; minute < 4; minute++) {
					daySchedule[hour][minute] = {
						name: DefaultSchedulingValue.name,
						detail: DefaultSchedulingValue.detail,
						backColor: DefaultSchedulingValue.backColor,
						fontColor: DefaultSchedulingValue.fontColor,
					};
				}
			}
			daySchedule.length = 24;

			//additionInfoを初期化;
			//各プロパティに代替値を代入;
			additionInfo = {};
			additionInfo.title = DefaultSchedulingValue.title;
			additionInfo.lineColor = DefaultSchedulingValue.lineColor;
			additionInfo.startPointHour = DefaultSchedulingValue.startPointHour;
			additionInfo.startPointMinute = DefaultSchedulingValue.startPointMinute;

			//履歴に追加;
			history.add(this.getDaySchedule());
		};

		//dayScheduleを参照(値渡し)する;
		//additionInfoのプロパティをdayScheduleのプロパティに代入する;
		//このメソッドからしかdayScheduleは得られない;
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

		//変数schedulingDataにクラスSchedulingDataのインスタンスである引数dataを代入;
		function setSchedulingData(data) {
			//引数がSchedulingでなければエラーを返す;
			if(!(data instanceof SchedulingData)) {
				throw new TypeError();
			}
			schedulingData = data;
		}
		//dayScheduleにschedulingDataの値を追加する;
		//addメソッドで使う;
		function addTimeSchedule(time, schedulingData) {
			daySchedule[time.hour][time.minute].name = schedulingData.name;
			daySchedule[time.hour][time.minute].detail = schedulingData.detail;
			daySchedule[time.hour][time.minute].backColor = schedulingData.backColor;
			daySchedule[time.hour][time.minute].fontColor = schedulingData.fontColor;
		}

		//引数で渡されたschedulingDataをdayScheduleに追加する;
		//このメソッドによってdayScheduleが構築されていく;
		this.add = function(schedulingData) {
			//引数はSchedulingDataのインスタンスであるか確かめる;
			setSchedulingData(schedulingData);
			//そのスケジュールは0時を通るか;
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
				//startからfinishHourまで追加;
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
			}
			//履歴に追加;
			history.add(this.getDaySchedule());
		};

		//スケジュール表のタイトルをadditionInfoに追加;
		this.setTitle = function(title) {
			if(title instanceof ScheduleTitle) {
				additionInfo.title = title.getTitle();
			}
		};
		//線の色をadditionInfoに追加;
		this.setLineColor = function(lineColor) {
			if(lineColor instanceof ScheduleLineColor) {
				additionInfo.lineColor = lineColor.getColor();
			}
		};
		//始点をadditionInfoに追加;
		this.setStartPoint = function(startPoint) {
			if(startPoint instanceof ScheduleStartPoint) {
				additionInfo.startPointHour = startPoint.getHour();
				additionInfo.startPointMinute = startPoint.getMinute();
			}
		};

		//dayScheduleを履歴の一つ前に戻す;
		this.undo = function() {
			if(!history.undoes()) {
				return;
			}
			daySchedule = history.undo();
		};
		//戻したのをやり直す;
		this.redo = function() {
			if(!history.redoes()) {
				return;
			}
			daySchedule = history.redo();
		};


		//コンストラクタが呼ばれた時の処理;
		//引数にdayScheduleがあるかいなか
		if(!Scheduler.isDaySchedule(daySchedule)) {
			//なければ初期化処理;
			this.init();
		}else {
			//あればdayScheduleのプロパティをadditionInfoに代入;
			var keys = Object.keys(daySchedule);
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				if(key < daySchedule.length) {
					continue;
				}

				additionInfo[key] = daySchedule[key];
			}
			//dayScheduleを履歴に追加;
			history.add(this.getDaySchedule());
		}

	}

	//引数がdayScheduleの構造か確かめるクラスメソッド;
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


//dayScheduleを画面に表示させやすい構造に変える(整形する)ためにdayScheduleを解析するクラス;
//整形することによって一日の予定をグラフやテキストに表しやすくなる;
//親クラス;
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
			//整形したdayScheduleが入るプロパティ;
			formatSchedule: {
				value: new Array(),
			},
			//dayScheduleをどこから解析するかの開始時刻;
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
			//現解析スケジュール時刻の次のスケジュールの時刻;
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

		//現解析時刻に解析開始時刻を代入;
		this.currentTime.hour = this.startTime.hour;
		this.currentTime.minute = this.startTime.minute;
	};

	//解析開始時刻を決めるメソッド;
	ScheduleAnalyst.prototype.setStartingPoint = function() {
		//dayScheduleの中の予定は日(0時)を跨っているか;
		if(!this.isSameTimeSchedule(this.daySchedule[23][3], this.daySchedule[0][0])) {
			//跨っていないなら0時が開始点;
			this.startTime.hour = 0;
			this.startTime.minute = 0;
		}else {
			//跨っているなら0時のスケジュールの次点のスケジュールが開始点;
			this.currentTime.hour = 0;
			this.currentTime.minute = 0;
			this.moveNextPoint();
			this.startTime.hour = this.nextTime.hour;
			this.startTime.minute = this.nextTime.minute;
		}
	};

	//2つの引数のスケジュールの内容が同じか否か真偽値を返す;
	ScheduleAnalyst.prototype.isSameTimeSchedule = function(currentSchedule, nextSchedule) {
		return (currentSchedule.name === nextSchedule.name && 
			currentSchedule.detail === nextSchedule.detail && 
			currentSchedule.backColor === nextSchedule.backColor && 
			currentSchedule.fontColor === nextSchedule.fontColor);
	};

	//現解析時刻が解析開始時刻かどうかの真偽値を返す;
	//スケジュールの解析が一周したかを確かめるためのメソッド;
	ScheduleAnalyst.prototype.isStartingPoint = function() {
		return this.currentTime.point === this.startTime.point;
	};

	//currentTimeをnextTimeに移動させる;
	ScheduleAnalyst.prototype.moveCurrentPointToNextPoint = function() {
		this.currentTime.hour = this.nextTime.hour;
		this.currentTime.minute = this.nextTime.minute;
	};
	//一つのスケジュールの時間の長さを求める;
	//15分区切りのため1時間の長さは60 / 15 = 4, 一日の長さは24 * 4 = 96;
	//最小1、最大96;
	ScheduleAnalyst.prototype.getCurrentScheduleSize = function() {
		var currentPoint = this.currentTime.point;
		var nextPoint = this.nextTime.point;
		//0時を跨いでいるか;
		if(currentPoint >= nextPoint) {
			//currentPointよりnextPointの方が小さいと長さを測れないため、1日分の長さを追加;
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
		//現解析時刻から24時までループを回す;
		//現解析時刻の予定と違う時点でループを止める;
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

		//flagが立っていないということは24時間同じ予定ということなので次の時刻に現解析時刻を代入;
		if(!flag) {
			this.nextTime.hour = this.currentTime.hour;
			this.nextTime.minute = this.currentTime.minute;
		}
	};


	//dayScheduleを解析して整形し、整形されたformatScheduleを返す(値渡し);
	ScheduleAnalyst.prototype.shaping = function() {
		//現解析時刻を解析開始時刻に設定;
		this.currentTime.hour = this.startTime.hour;
		this.currentTime.minute = this.startTime.minute;

		do {
			//nextTimeを移動;
			this.moveNextPoint();
			//現解析時刻のスケジュールを参照;
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

		//dayScheduleのプロパティをformatScheduleに代入;
		this.shapingBriefly();

		return clone(this.formatSchedule);
	};

	//dayScheduleのプロパティをformatScheduleに代入するメソッド;
	//表示側のクラスがdayScheduleのプロパティのみ欲しい場合に呼ばれる;
	ScheduleAnalyst.prototype.shapingBriefly = function() {
		this.formatSchedule.title = this.daySchedule.title;
		this.formatSchedule.lineColor = this.daySchedule.lineColor;

		return clone(this.formatSchedule);
	};

	//引数がformatScheduleの構造かどうか確かめる;
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

//dayScheduleのdetailを除いてdayScheduleを解析するクラス;
//detailを必要としない円グラフ表示のためのクラス;
//ScheduleAnalystを継承する;
var ScheduleExcludingDetailAnalyst = (function() {
	var ScheduleExcludingDetailAnalyst = function(daySchedule) {
		//解析開始時刻は自動的に決める;
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

//dayScheduleを解析して整形するクラス;
//スケジュール表示側のクラスは通常このクラスを通して一日のスケジュール情報を得る;
//ScheduleAnalystを継承する;
var ScheduleStrictAnalyst = (function() {
	var ScheduleStrictAnalyst = function(daySchedule) {
		ScheduleAnalyst.call(this, daySchedule);
		//解析開始時刻を決める;
		if(ScheduleTime.isTime(daySchedule.startPointHour) && ScheduleTime.isTime(daySchedule.startPointMinute)) {
			//解析開始時刻が指定されているのであれば代入;
			this.startTime.hour = daySchedule.startPointHour;
			this.startTime.minute = daySchedule.startPointMinute;
			//現解析時刻に解析開始時刻を代入;
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


//スケジュール表示クラス;
//このクラスを通して画面にスケジュール(及びそれに類するもの)を表示する;
var ScheduleDisplay = (function() {
	//画面に表示するdayScheduleを引数に取る;
	//(最初からformatScheduleを受け取ってもいいかもしれない);
	var ScheduleDisplay = function(daySchedule) {
		if(!Scheduler.isDaySchedule(daySchedule)) {
			throw new TypeError();
		}

		Object.defineProperties(this, {
			daySchedule: {value: daySchedule},
		});
	};

	//スケジュール表示エリアにスケジュールの円グラフとテキスト表示するメソッド;
	ScheduleDisplay.prototype.displaySchedule = function() {
		//dayScheduleを処理しやすい構造に整形する;
		var scheduleExcludingDetailAnalyst = new ScheduleExcludingDetailAnalyst(this.daySchedule);
		//整形したdayScheduleを円グラフを描くクラスに渡す;
		var mainScheduleDrawer = new MainScheduleDrawer(scheduleExcludingDetailAnalyst.shaping());
		//dayScheduleを処理しやすい構造に整形する;
		var scheduleStrictAnalyst = new ScheduleStrictAnalyst(this.daySchedule);
		//整形したdayScheduleをテキスト表示するクラスに渡す;
		var scheduleWriter = new ScheduleWriter(scheduleStrictAnalyst.shaping());

		//円グラフを描く;
		mainScheduleDrawer.draw();
		//テキストを書く;
		scheduleWriter.write();
	};

	//タイトルを変えて表示する;
	ScheduleDisplay.prototype.changeTitle = function() {
		//dayScheduleを処理しやすい構造に整形する;
		var scheduleAnalyst = new ScheduleStrictAnalyst(this.daySchedule);
		//整形したdayScheduleをタイトル表示クラスに渡す;
		var scheduleTitleWriter = new ScheduleTitleWriter(scheduleAnalyst.shapingBriefly());
		//タイトルを表示する;
		scheduleTitleWriter.write();
	};

	//円グラフの線の色を変える;
	ScheduleDisplay.prototype.changeLineColor = function() {
		//dayScheduleを整形する;
		var scheduleAnalyst = new ScheduleExcludingDetailAnalyst(this.daySchedule);
		//整形したdayScheduleを円グラフを描くクラスに渡す;
		var mainScheduleDrawer = new MainScheduleDrawer(scheduleAnalyst.shapingBriefly());
		//円グラフの色を塗り直す;
		mainScheduleDrawer.paintLineColor();
	};

	//テキスト表示の始点を変える;
	//(要リファクタリング: 始点の変更は他で処理しているので、displayTextScheduleなるメソッドを作って単に整形されたdayScheduleからtextを表示すればいい);
	ScheduleDisplay.prototype.changeStartPoint = function() {
		//単に整形されたdayScheduleからテキストを表示する;
		var scheduleAnalyst = new ScheduleStrictAnalyst(this.daySchedule);
		var scheduleWriter = new ScheduleWriter(scheduleAnalyst.shaping());
		scheduleWriter.write();
	};

	//クラスプロパティ;
	//表示に関連する要素;
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

//スケジュール表のタイトルを表示するクラス;
var ScheduleTitleWriter = (function() {
	//表示するタイトルをforamtScheduleから得るため、引数にformatScheduleを取る;
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

//スケジュールを円グラフで表示するためのクラス;
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
			//formatSchedule内の個々のスケジュールが入るプロパティ;
			currentSchedule: {
				value: null,
				writable: true,
				configurable: true,
			},
			//canvas要素やsvg要素が入るプロパティ;
			canvas: {
				value: null,
				writable: true,
				configurable: true,
			},
			//一つのスケジュール(15分)の角度;
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
			//scheduleName(currentScheduleのname)が入るプロパティ;
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

	//currentScheduleの始点の角度と終点の角度をセットする;
	//startPoint,finishPointは0~95の数値が入っている;
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
	//スケジュールが24時間全て同じだった場合、扇形ではなく円で描く必要があるため;
	ScheduleDrawer.prototype.isCircle = function() {
		return this.formatSchedule.length === 1;
	};

	return ScheduleDrawer;
})();

//スケジュールをSVGを使った円グラフで表示するためのクラス;
//ScheduleDrawerを継承する;
var ScheduleSvgDrawer = (function() {
	var ScheduleSvgDrawer = function(formatSchedule) {
		ScheduleDrawer.call(this, formatSchedule);

		Object.defineProperties(this, {
			//svgのネームスペース;
			NS: {value: 'http://www.w3.org/2000/svg'},
			//円や扇形を描く要素が入っているグループ要素のクラスネーム;
			arcGroupClassName: {value: 'arc-group'},
		});
	};

	ScheduleSvgDrawer.prototype = Object.create(ScheduleDrawer.prototype, {
		constructor: {value: ScheduleSvgDrawer},
	});

	//円または扇形全ての線の色を塗る;
	ScheduleSvgDrawer.prototype.paintLineColor = function() {
		this.setLineColor();

		//円や扇形がまとまって入っているグループ要素を取得:
		var arcGroup = this.canvas.querySelector('.' + this.arcGroupClassName);
		arcGroup.setAttributeNS(null, 'stroke', this.lineColor);
	};

	//一つの予定を扇形として表す;
	//path要素を返す;
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

		//path要素で扇形を作る;
		var path = document.createElementNS(this.NS, 'path');
		path.setAttributeNS(null, 'd', center + line + arc);
		path.setAttributeNS(null, 'fill', this.fill);

		return path;
	};

	//一つの予定を円として表す;
	//circle要素を返す;
	ScheduleSvgDrawer.prototype.createCircle = function() {
		//circle要素で円を作る;
		var circle = document.createElementNS(this.NS, 'circle');
		circle.setAttributeNS(null, 'cx', this.cx);
		circle.setAttributeNS(null, 'cy', this.cy);
		circle.setAttributeNS(null, 'r', this.r);
		circle.setAttributeNS(null, 'fill', this.fill);

		return circle;
	};

	//svg要素の子要素を全て消す;
	ScheduleSvgDrawer.prototype.renewCanvas = function() {
		removeChildren(this.canvas);
	};

	//スケジュールを円グラフとして表す;
	//circle要素や個々のpath要素が全て入ったg要素を返す;
	ScheduleSvgDrawer.prototype.createPieChart = function() {
		//g要素を作成;
		var arcGroup = document.createElementNS(this.NS, 'g');
		arcGroup.setAttributeNS(null, 'class', this.arcGroupClassName);
		arcGroup.setAttributeNS(null, 'stroke-width', this.strokeWidth);

		//スケジュールは円1つで描くか扇形を繋げて描くか;
		if(this.isCircle()) {
			//円1つで描く処理;
			this.currentSchedule = this.formatSchedule[0];
			this.setScheduleDegree();
			this.setBackColor();

			var circle = this.createCircle();
			arcGroup.appendChild(circle);
		}else {
			//扇形の処理、一つ一つのスケジュールを繋げていく;
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

	//svgにスケジュールを円グラフ化した要素を加え、表示する;
	ScheduleSvgDrawer.prototype.draw = function() {
		//svgをまっさらに;
		this.renewCanvas();
		//円グラフを表示する;
		this.canvas.appendChild(this.createPieChart());
		this.paintLineColor();
	};

	return ScheduleSvgDrawer;
})();

//スケジュール表示エリアに表示する円グラフを描くための必要な値を持っているオブジェクト;
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
		this.clockFontColor = DefaultSchedulingValue.fontColor;
	};

	return new MainScheduleValue();
})();

//スケジュールをスケジュール表示エリアにSVGを使った円グラフで表示するためのクラス;
//ScheduleSvgDrawerを継承する;
var MainScheduleDrawer = (function() {
	var MainScheduleDrawer = function(formatSchedule) {
		ScheduleSvgDrawer.call(this, formatSchedule);

		Object.defineProperties(this, {
			//svg要素;
			canvas: {
				value: ScheduleDisplay.pieChart.querySelector('svg'),
				configurable: true,
			},
			//box-sizing: border-boxは効かないから,半径に線幅を加味する;
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

	//スケジュールの予定名を入れたtext要素を作る;
	//text要素を返す;
	MainScheduleDrawer.prototype.createText = function() {
		//テキストの座標を決めるための円の中心角.スケジュールの始点と終点の角度の真ん中の角度になる;
		//例: スケジュールの始点50度、終点70度のときテキスト表示位置の角度は60度;
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

	//スケジュールの全ての予定名をtext要素として作る;
	//予定名のtext要素が全て入ったg要素を返す;
	MainScheduleDrawer.prototype.createPieChartText = function() {
		var textGroup = document.createElementNS(this.NS, 'g');
		textGroup.setAttributeNS(null, 'class', 'text-group');
		textGroup.setAttributeNS(null, 'text-anchor', this.textAnchor);
		textGroup.setAttributeNS(null, 'font-size', this.fontSize);
		//ループで一つ一つテキスト要素を作っていく;
		for(var i = 0; i < this.formatSchedule.length; i++) {
			this.currentSchedule = this.formatSchedule[i];
			this.setScheduleDegree();
			this.setFontColor();
			this.setText();

			textGroup.appendChild(this.createText());
		}

		return textGroup;
	};

	//時刻の文字を作る;
	MainScheduleDrawer.prototype.createClockText = function(time) {
		var degree = 360 / 24 * time;
		//テキストの座標;
		var textX = this.cx + this.clockR * Math.sin(degree / 180 * Math.PI);
		var textY = this.cy - this.clockR * Math.cos(degree / 180 * Math.PI);

		var text = document.createElementNS(this.NS, 'text');
		text.textContent = time;
		text.setAttributeNS(null, 'x', textX);
		text.setAttributeNS(null, 'y', textY);
		text.setAttributeNS(null, 'dominant-baseline', 'middle');

		return text;
	};

	//円の周りに表示する時刻を作る;
	//時刻の文字のtext要素が全て入ったg要素を返す;
	MainScheduleDrawer.prototype.createClock = function() {
		var clock = document.createElementNS(this.NS, 'g');
		clock.setAttributeNS(null, 'class', 'clock');
		clock.setAttributeNS(null, 'text-anchor', 'middle');
		clock.setAttributeNS(null, 'font-size', this.clockFontSize);
		clock.setAttributeNS(null, 'fill', this.clockFontColor);
		
		//3刻みで時刻を表示する;
		var i = 0;
		while(i < 24) {
			clock.appendChild(this.createClockText(i));
			i += 3;
		}

		return clock;
	}

	//スケジュールを全て画面に表示;
	MainScheduleDrawer.prototype.draw = function() {
		//canvasをまっさらに;
		this.renewCanvas();
		//円グラフを表示;
		this.canvas.appendChild(this.createPieChart());
		//円グラフの中の予定名を表示;
		this.canvas.appendChild(this.createPieChartText());
		//円グラフの周りに時刻を表示;
		this.canvas.appendChild(this.createClock());
		//円グラフの線の色を塗る;
		this.paintLineColor();
	};

	return MainScheduleDrawer;
})();

//スケジュール表示エリアに表示する円グラフをCanvasを使って描くためのクラス;
//ユーザーが作った予定表をダウンロードする時に使われる;
//MainScheduleDrawerのCanvas版;
//そのためSVGとCanvasの細かい仕様の違いを除けば処理手順はほとんどMainScheduleDrawerと同じ;
//ScheduleDrawerを継承する;
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

//ストレージスケジュール表示エリアにストレージに入ってるスケジュールを円グラフで表示するためのクラス;
//ScheduleSvgDrawerを継承する;
var StorageScheduleDrawer = (function() {
	//引数に円グラフを表示する要素を取る;
	var StorageScheduleDrawer = function(formatSchedule, canvas) {
		if(!(canvas instanceof Element)) {
			throw new TypeError();
		}

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

//スケジュールをテキストで表示するためのクラス;
var ScheduleWriter = (function() {
	var ScheduleWriter = function(formatSchedule) {
		if(!ScheduleAnalyst.isFormatSchedule(formatSchedule)) {
			throw new TypeError();
		}
		Object.defineProperties(this, {
			formatSchedule: {
				value: formatSchedule,
			},
			//formatSchedule内の個々のスケジュールが入るプロパティ;
			currentSchedule: {
				value: null,
				writable: true,
				configurable: true,
			},
			//テキストを置く要素
			writingArea: {
				value: ScheduleDisplay.writing.querySelector('dl.schedule'),
			},
			borderColor: {
				value: null,
				writable: true,
				configurable: true,
			},
			//予定の時刻が入るプロパティ;
			time: {
				value: null,
				writable: true,
				configurable: true,
			},
			//予定名が入るプロパティ;
			name: {
				value: null,
				writable: true,
				configurable: true,
			},
			//予定の補足が入るプロパティ;
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

	//dt要素を返す;
	//dt要素には時刻のテキストが入っている;
	ScheduleWriter.prototype.createTimeDT = function() {
		var dt = document.createElement('dt');
		dt.className = 'time';
		dt.style.borderColor = this.borderColor;
		dt.textContent = this.time;
		return dt;
	};

	//dd要素を返す;
	//dd要素には予定名が入っている;
	ScheduleWriter.prototype.createNameDD = function() {
		var dd = document.createElement('dd');
		dd.className = 'name';
		dd.textContent = this.name;
		return dd;
	};

	//dd要素を返す;
	//dd要素には予定の補足が入っている;
	ScheduleWriter.prototype.createDetailDD = function() {
		var dd = document.createElement('dd');
		dd.className = 'detail';
		dd.innerHTML = this.detail;
		return dd;
	};

	//時刻、予定名、予定の補足全てが入ったフラグメント要素を返す;
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

	//writingAreaをまっさらに;
	ScheduleWriter.prototype.renewWritingArea = function() {
		removeChildren(this.writingArea);
	};

	//スケジュールをテキストで表示する;
	ScheduleWriter.prototype.write = function() {
		this.renewWritingArea();
		this.writingArea.appendChild(this.createDraft());
	};

	return ScheduleWriter;
})();

//dayScheduleを保存するストレージに関するクラス;
//localStorageを使う;
//親クラス;
var ScheduleStorage = (function() {
	var ScheduleStorage = function() {
		//localStorageに保存する時のkey;
		var tableName = 'schedules';
		//localStorageに保存するオブジェクト,いわばこれがScheduleStorage;
		//dayScheduleなどのスケジュールデータはこのオブジェクトを介してlocalStorageに保存する;
		//すでにkeyがあればlocalStorageから取得、なければ新たにオブジェクトを作る;
		var table = JSON.parse(localStorage.getItem(tableName)) || {};
		//ゴミオブジェクト;
		//捨てる予定のデータを入れる;
		var trashes = JSON.parse(localStorage.getItem('trashes')) || {};

		Object.defineProperties(this,{
			table: {value: table},
			trashes: {value: trashes},
		});
	};

	//tableオブジェクトのkeyを全て取得する;
	ScheduleStorage.prototype.getKeys = function() {
		return Object.keys(this.table).sort();
	};
	//ゴミオブジェクトのkeyを全て取得する;
	ScheduleStorage.prototype.getTrashKeys = function() {
		return Object.keys(this.trashes);
	};
	//tableオブジェクトをlocalStorageに保存;
	ScheduleStorage.prototype.save = function() {
		localStorage.setItem('schedules', JSON.stringify(this.table));
	};
	//ゴミオブジェクトをlocalStorageに保存;
	ScheduleStorage.prototype.throwAwayTrash = function() {
		localStorage.setItem('trashes', JSON.stringify(this.trashes));
	};
	//tableオブジェクト内のプロパティを全て削除;
	//削除する前にゴミオブジェクトに移行している;
	ScheduleStorage.prototype.allRemove = function() {
		for(key in this.table) {
			this.trashes[key] = this.table[key];
			delete this.table[key];
		}

		this.throwAwayTrash();
		this.save();
	};
	//ゴミオブジェクトに入っているスケジュールデータをtableオブジェクトに戻す;
	ScheduleStorage.prototype.restore = function() {
		for(key in this.trashes) {
			this.table[key] = this.trashes[key];
			delete this.trashes[key];
		}

		this.throwAwayTrash();
		this.save();
	};
	//localStorageのゴミ箱を空に;
	ScheduleStorage.prototype.emptyTrashCan = function() {
		localStorage.removeItem('trashes');
	};

	//ScheduleStorage内のスケジュールデータを編集する時、このクラスプロパティに編集中のkeyが入る;
	//(要リファクタリング);
	ScheduleStorage.editing = null;

	//引数がkeyとして相応しい値か真偽値を返す;
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

//スケジュールデータを保存するためのクラス;
//ScheduleStorageを継承する;
var ScheduleSaver = (function() {
	//保存するdayScheduleを引数に取る;
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

	//スケジュールデータをlocalStorageに保存;
	//保存するkeyを返す;
	ScheduleSaver.prototype.add = function() {
		//現在の時間でkey名を生成;
		var time = new Date().getTime();
		var key = 'key' + time;
		//tableオブジェクトに保存;
		this.table[key] = {
			data: this.daySchedule,
			created: time,
			update: time,
		};

		this.save();

		//保存したら編集していることになる;
		ScheduleStorage.editing = key;
		return key;
	};

	//スケジュールデータを上書きする;
	//keyは引数ではなくScheduleStorage.editiogのkeyを取得する;
	//(要リファクタリング);
	//保存した場合keyを返す、保存されなかった場合nullを返す;
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

//localStorage内のスケジュールデータを編集するクラス;
//ScheduleStorageを継承する;
var StorageEditor = (function() {
	//引数に編集したいスケジュールデータのkeyを取る;
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

	//スケジュールデータ(daySchedule)を返す;
	StorageEditor.prototype.load = function() {
		return clone(this.table[this.key].data);
	};

	//スケジュールデータをゴミ箱に移す;
	//今の段階ではlocalStorageから更新日も作成日も削除;
	//サーバーと連携できるようになった段階で変更する;
	StorageEditor.prototype.remove = function() {
		this.trashes[this.key] = this.table[this.key];
		delete this.table[this.key];

		this.throwAwayTrash();
		this.save();

		return this.key;
	};

	//ゴミ箱から元に戻す;
	StorageEditor.prototype.restore = function() {
		this.table[this.key] = this.trashes[this.key];
		delete this.trashes[this.key];

		this.throwAwayTrash();
		this.save();

		return this.key;
	};

	return StorageEditor;
})();

//ストレージのスケジュールデータを表示する要素を作るクラス;
var StorageScheduleDisplayCreator = (function() {
	//引数に表示するデータのkeyを取る;
	var StorageScheduleDisplayCreator = function(key) {
		if(!ScheduleStorage.isKey(key)) {
			throw new TypeError();
		}

		//div要素にまとめて必要な要素を入れる;
		//div要素のidはkey名と同じ;
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

	//タイトル部分の要素を作成するクラス;
	//要素を返す;
	StorageScheduleDisplayCreator.prototype.createTitle = function() {
		//要素はp;
		var title = document.createElement('p');
		title.className = 'title';
		//ストレージにkeyを渡してデータを取得;
		var storageEditor = new StorageEditor(this.key);
		title.textContent = storageEditor.load().title;

		return title;
	};

	//ストレージのスケジュールデータを円グラフで表す;
	//svg要素を返す;
	StorageScheduleDisplayCreator.prototype.createPieChart = function() {
		var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		svg.setAttribute('class', 'pie-chart');

		//ストレージからデータを取得;
		var storageEditor = new StorageEditor(this.key);
		//取得したデータを整形するためにインスタンス化;
		var scheduleExcludingDetailAnalyst = new ScheduleExcludingDetailAnalyst(storageEditor.load());
		//整形したformatScheduleを取得;
		var formatSchedule = scheduleExcludingDetailAnalyst.shaping();
		//StorageScheduleDrawerクラスに渡して描く;
		var storageScheduleDrawer = new StorageScheduleDrawer(formatSchedule, svg);
		storageScheduleDrawer.draw();

		return svg;
	};

	//スケジュール編集ボタンを作成する;
	//要素を返す;
	StorageScheduleDisplayCreator.prototype.createEditButton = function() {
		var button = document.createElement('input');
		button.setAttribute('type', 'button');
		button.setAttribute('name', 'edit');
		button.setAttribute('value', '編集');

		var editButton = new EditButton(button);
		editButton.addClickListener(this.editListener.bind(this));

		return button;
	};

	//編集ボタン押した時の処理;
	//このクラスが持っているkeyのスケジュールをユーザーが編集できるようにする;
	//このクラスに書くかどうかは要検証;
	StorageScheduleDisplayCreator.prototype.editListener = function() {
		//スケジュール作成フォームを初期化;
		SchedulingForm.init();

		//ストレージからdayScheduleを取得
		var daySchedule = new StorageEditor(this.key).load();
		var scheduler = new Scheduler(daySchedule);
		var scheduleDisplay = new ScheduleDisplay(daySchedule);
		var schedulingForm = new SchedulingForm();

		//スケジュール作成フォーム内のイベントを定義;
		schedulingForm.setEventListener(scheduler);
		//スケジュール表示エリアにスケジュールを表示;
		scheduleDisplay.displaySchedule();
		scheduleDisplay.changeTitle();

		SchedulingForm.setTitle(daySchedule.title);
		SchedulingForm.setLineColor(daySchedule.lineColor);
		SchedulingForm.setStartPoint({hour: daySchedule.startPointHour, minute: ScheduleTime.fixMinute(daySchedule.startPointMinute)});
		ScheduleStorage.editing = this.key;
	};

	//スケジュール削除ボタンを作成する;
	//要素を返す;
	StorageScheduleDisplayCreator.prototype.createRemoveButton = function() {
		var button = document.createElement('input');
		button.setAttribute('type', 'button');
		button.setAttribute('name', 'remove');
		button.setAttribute('value', '削除');

		var removeButton = new RemoveButton(button);
		removeButton.addClickListener(this.removeListener.bind(this));

		return button;
	};

	//削除ボタンを押した時の処理;
	//このクラスが持っているkeyのスケジュールを消す;
	//ストレージ表示エリアからも該当要素を全て消す;
	StorageScheduleDisplayCreator.prototype.removeListener = function() {
		//keyをStorageEditorに渡してストレージから消す;
		var storageEditor = new StorageEditor(this.key);
		storageEditor.remove();

		//要素を消す;
		removeChildren(this.container);

		//リストアボタンを作成する;
		this.container.appendChild(this.createRestoreButton());
	};

	//リストアボタンを作成する;
	StorageScheduleDisplayCreator.prototype.createRestoreButton = function() {
		var button = document.createElement('input');
		button.setAttribute('type', 'button');
		button.setAttribute('name', 'restore');
		button.setAttribute('value', '元に戻す');

		var restoreButton = new RestoreButton(button);
		restoreButton.addClickListener(this.restoreListener.bind(this));

		return button;
	};

	//リストアボタンが押された時の処理;
	StorageScheduleDisplayCreator.prototype.restoreListener = function() {
		var storageEditor = new StorageEditor(this.key);
		storageEditor.restore();

		//再び要素を作って上書きする;
		this.overwrite();
	};

	//ストレージのスケジュールデータを表示するための要素を全て作り、画面に表示;
	StorageScheduleDisplayCreator.prototype.create = function() {
		this.container.appendChild(this.createTitle());
		this.container.appendChild(this.createPieChart());
		this.container.appendChild(this.createEditButton());
		this.container.appendChild(this.createRemoveButton());

		return this.container;
	};

	//要素を全て消してから再び全ての要素を作って表示;
	StorageScheduleDisplayCreator.prototype.overwrite = function() {
		removeChildren(this.container);
		return this.create();
	};

	return StorageScheduleDisplayCreator;
})();

//ストレージ表示エリアに関するクラス;
var StorageDisplay = (function() {
	var StorageDisplay = function() {
		Object.defineProperties(this, {
			//ストレージ表示エリアの要素;
			area: {value: StorageDisplay.element},
		});
	};

	//ストレージ表示エリアにストレージスケジュールデータを全て表示;
	StorageDisplay.prototype.display = function() {
		var keys = new ScheduleStorage().getKeys();
		for(var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var storageScheduleDisplayCreator = new StorageScheduleDisplayCreator(key);
			var div = storageScheduleDisplayCreator.create();

			this.area.appendChild(div);
		}
	};

	//引数のkeyで得られるスケジュールデータをストレージ表示エリアに追加で表示する;
	StorageDisplay.prototype.add = function(key) {
		if(!ScheduleStorage.isKey(key)) {
			return;
		}

		var storageScheduleDisplayCreator = new StorageScheduleDisplayCreator(key);
		this.area.appendChild(storageScheduleDisplayCreator.create());
	};

	//引数のkeyで得られるスケジュールデータをストレージ表示エリアに上書きして表示する;
	StorageDisplay.prototype.overwrite = function(key) {
		if(!ScheduleStorage.isKey(key)) {
			return;
		}

		var storageScheduleDisplayCreator = new StorageScheduleDisplayCreator(key);
		storageScheduleDisplayCreator.overwrite();
	};

	//ストレージ表示エリアの要素を全て消す;
	//ストレージからも消している;
	//(要リファクタリング: 表示とストレージ削除の処理は分ける);
	StorageDisplay.prototype.allRemove = function() {
		var keys = new ScheduleStorage().getKeys();
		for(var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var storageScheduleDisplayCreator = new StorageScheduleDisplayCreator(key);
			storageScheduleDisplayCreator.removeListener();
		}
	};

	//allRemoveメソッド実行後、元に戻すメソッド;
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


//Colorクラス;
//引数に入力されたカラーコードの分析をしたり改変したりする;
var Color = (function() {
	//カラーコードを引数に取る;
	var Color = function(color) {
		//カラーコードが不正であればエラーを返す;
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

	//カラーコードの"#"を除いた16進数で表された部分を文字列で返す;
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

	//正当なカラーコードか真偽を返す;
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
//IEのカラーフォームを便利にする;
//Colorクラスを包含する;
var ColorForm = (function() {
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
		//changeイベントを発火させる準備;
		//プログラム側でフォーム内の値を変更してもchangeイベントは自動で発火しないため;
		var changeEvent = document.createEvent('Event');
		changeEvent.initEvent('change', false, true);
		var delta = e.deltaY ? -(e.deltaY) : e.wheelDelta ? e.wheelDelta : -(e.detail);
		if(delta < 0) {
			//下にスクロールした場合の処理
			e.preventDefault();
			this.decrement();
			this.setStyle();
			//changeイベントを発火;
			this.element.dispatchEvent(changeEvent);
		}else if(delta > 0) {
			//上にスクロールした場合の処理
			e.preventDefault();
			this.increment();
			this.setStyle();
			//changeイベントを発火;
			this.element.dispatchEvent(changeEvent);
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

//hourフォームを便利にするクラス;
//(要リファクタリング: NumberFormという親クラスを作って継承させる);
var ScheduleHourForm = (function() {
	//input[type="number"]の要素を引数にとる;
	var ScheduleHourForm = function(element) {
		if(element.getAttribute('type') !== 'number') {
			throw new TypeError();
		}

		Object.defineProperties(this, {
			element: {value: element},
			handler: {value: new Handler(element)},
		});
	};

	//フォーム内の数字に1をプラス;
	ScheduleHourForm.prototype.increment = function() {
		var hour = Number(this.element.value);
		if(!ScheduleTime.isTime(hour) || hour < 0 || hour >= 23) {
			this.element.value = '0';
			return;
		}
		this.element.value = hour + 1;
		return;
	};
	//フォーム内の数字に1をマイナス;
	ScheduleHourForm.prototype.decrement = function() {
		var hour = Number(this.element.value);
		if(!ScheduleTime.isTime(hour) || hour <= 0 || hour > 23) {
			this.element.value = '23';
			return;
		}
		this.element.value = hour - 1;
		return;
	};

	//focus時のイベントリスナー
	//focus時以外は発火させないためfocus時に他のイベントを登録し,blur時に定義したイベントを全て消す;
	ScheduleHourForm.prototype.addFocusListener = function() {
		this.handler.addListener('focus', function() {
			var handler = new Handler(this.element);
			handler.addListener(mousewheel, mousewheelListener.bind(this), false);

			handler.addListener('blur', function() {
				handler.removeAllListener();
			}, false);
		}.bind(this), false);
	};

	//マウスホイール時の処理;
	//フォーム内の値に1を足したり引いたり;
	function mousewheelListener(e) {
		//changeイベントを発火させる準備;
		//プログラム側でフォーム内の値を変更してもchangeイベントは自動で発火しないため;
		var changeEvent = document.createEvent('Event');
		changeEvent.initEvent('change', false, true);
		var delta = e.deltaY ? -(e.deltaY) : e.wheelDelta ? e.wheelDelta : -(e.detail);
		if(delta < 0) {
			//下にスクロールした場合の処理
			e.preventDefault();
			e.stopPropagation();
			this.decrement();
			//changeイベントを発火;
			this.element.dispatchEvent(changeEvent);
		}else if(delta > 0) {
			//上にスクロールした場合の処理
			e.preventDefault();
			e.stopPropagation();
			this.increment();
			//changeイベントを発火;
			this.element.dispatchEvent(changeEvent);
		}
	}

	return ScheduleHourForm;
})();

//increment,decrementの処理以外はScheduleHourFormと変わらない;
//(要リファクタリング: NumberFormという親クラスを作って継承させる);
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
			var handler = new Handler(this.element);
			handler.addListener(mousewheel, mousewheelListener.bind(this), false);

			handler.addListener('blur', function() {
				handler.removeAllListener();
			}, false);
		}.bind(this), false);
	};

	function mousewheelListener(e) {
		var changeEvent = document.createEvent('Event');
		changeEvent.initEvent('change', false, true);
		var delta = e.deltaY ? -(e.deltaY) : e.wheelDelta ? e.wheelDelta : -(e.detail);
		if(delta < 0) {
			//下にスクロールした場合の処理
			e.preventDefault();
			e.stopPropagation();
			this.decrement();
			this.element.dispatchEvent(changeEvent);
		}else if(delta > 0) {
			//上にスクロールした場合の処理
			e.preventDefault();
			e.stopPropagation();
			this.increment();
			this.element.dispatchEvent(changeEvent);
		}
	}

	return ScheduleMinuteForm;
})();

//canvas要素をダウンロードする時に使うクラス;
var CanvasDownloader = (function() {
	//canvas要素を引数にとる;
	var CanvasDownloader = function(canvas) {
		Object.defineProperties(this, {
			canvas: {value: canvas},
		});
	};

	//canvas要素を画像に変換してその画像のblobオブジェクトを取得する;
	//canvas=>binary=>png;
	CanvasDownloader.prototype.getBlob = function() {
		var dataURL = this.canvas.toDataURL();
		var binary = atob(dataURL.split(',')[1]);
		var buffer = new Uint8Array(binary.length);
		for(var i = 0, len = binary.length; i < len; i++) {
			buffer[i] = binary.charCodeAt(i);
		}

		return new Blob([buffer.buffer], {type: 'image/png'});
	};

	//canvas要素をpng形式の画像としてダウンロードする;
	//ダウンロードするファイルの名前を引数にとる;
	CanvasDownloader.prototype.download = function(title) {
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


(function main() {
	//localStorage内のゴミ箱を空に;
	new ScheduleStorage().emptyTrashCan();

	var scheduler = new Scheduler();
	schedulingForm = new SchedulingForm();
	//スケジュール作成フォーム内のイベントを登録;
	schedulingForm.setEventListener(scheduler);

	//スケジュールを画面に表示;
	var scheduleDisplay = new ScheduleDisplay(scheduler.getDaySchedule());
	var storageDisplay = new StorageDisplay();
	scheduleDisplay.changeTitle();
	scheduleDisplay.displaySchedule();
	storageDisplay.display();

	//各フォームの利便性を高めるイベントを登録;
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

})();