var AnimationController = (function() {

	var AnimationController = function() {
		var that = this;

		//この配列に実行したいアニメーションなどのメソッドを追加していく;
		var queue = [];
		//キューが空かどうかの真偽値を返す;
		queue.isEmpty = function() {
			return !Boolean(this.length);
		};
		//キューが動いているかどうかの真偽値;
		queue.busy = false;
		//キューを動かす(キューに入っているメソッドを実行していく);
		queue.run = function() {
			//既にキューが動いているなら終了;
			if(queue.busy) {
				return;
			}

			queue.busy = true;
			//キューを動かす処理.キューにデータが無くなるまで停止しない;
			(function run() {
				//キューが空であれば停止する;
				if(queue.isEmpty()) {
					queue.busy = false;
					return;
				}

				//キューに入っているメソッドを実行.戻り値はミリ秒を期待している;
				var time = queue[0].method();
				time = Number(time) || 0;
				that.dequeue();
				//アニメーション終了後、次のメソッドを実行する;
				setTimeout(run, time + 1); //1はアニメーション終了処理と干渉しないための待機時間;
			})();
		};
		//キューにアニメーションなどのメソッドを追加する;
		this.enqueue = function(method) {
			if(typeof method !== 'function') {
				return this;
			}
			queue.push({
				method: method,
				//start: new Date().getTime(),
			});
			queue.run();
			return this;
		};
		//キューの先頭を消す;
		this.dequeue = function() {
			queue.shift();
			return this;
		};
		//キューの中のデータを全て消す;
		this.clear = function() {
			queue.length = 0;
			return this;
		};
	};

	return AnimationController;
})();


var Animation = (function() {
	var Animation = function(element) {
		AnimationController.apply(this, null);

		//例外処理;
		if(arguments.length === 0) {
			throw (function() {
				var error = new TypeError();
				error.message = "Failed to construct 'Animation': 1 argument required, but only 0 present.";
				return error;
			})();
		}else if(!(element instanceof Element)) {
			throw (function() {
				var error = new TypeError();
				error.message = "Failed to construct 'Animation': Element must be provided.";
				return error;
			})();
		}
		var css = document.defaultView.getComputedStyle(element, null);
		var defaultCSS = {
			opacity: css.opacity,
			transitionProperty: css.transitionProperty,
			transitionDuration: css.transitionDuration,
			transitionTimingFunction: css.transitionTimingFunction,
			transitionDelay: css.transitionDelay,
			transition: css.transitionProperty + ' ' + css.transitionDuration + ' ' + css.transitionTimingFunction + ' ' + css.transitionDelay,
		};
		//プロパティを全て凍結;
		Object.defineProperties(this, {
			element: {
				value: element
			},
			css: {
				value: css
			},
			defaultCSS: {
				value: defaultCSS
			}
		});
	};

	Animation.prototype = Object.create(AnimationController.prototype, {
		constructor: {
			value: AnimationController
		}
	});

	Animation.prototype.show = function(transition, queue) {
		transition = transition || {};
		if(queue === false) {
			show.call(this, transition.duration, transition.timingFunction, transition.delay);
			return this;
		}
		this.enqueue(function() {
			return show.call(this, transition.duration, transition.timingFunction, transition.delay);
		}.bind(this));
		return this;
	};

	Animation.prototype.hide = function(transition, display, queue) {
		transition = transition || {};
		if(queue === false) {
			hide.call(this, transition.duration, transition.timingFunction, transition.delay, display);
			return this;
		}
		var that = this;
		this.enqueue(function() {
			return hide.call(that, transition.duration, transition.timingFunction, transition.delay, display);
		});
		return this;
	};

	Animation.prototype.wait = function(ms) {
		this.enqueue(function() {
			return Number(ms) || 0;
		});
		return this;
	};

	
	Animation.prototype.isDisplay = function() {
		if(this.css.display === 'none' || this.css.opacity === '0') {
			return false;
		}
		return true;
	}

	function getTransitionTime() {
		var style = this.element.style;
		var transition = {
			duration: parseFloat(style.transitionDuration) * 1000 || 0,
			delay: parseFloat(style.transitionDelay) * 1000 || 0,
		};
		return transition.duration + transition.delay;
	}

	function show(transitionDuration, transitionTimingFunction, transitionDelay) {
		//display: none ではないなら処理を終了;
		if(this.isDisplay()) {
			return 0;
		}

		var style = this.element.style;
		style.opacity = '0';
		style.transitionProperty = 'opacity';
		style.transitionDuration = transitionDuration || '0.2s';
		style.transitionTimingFunction = transitionTimingFunction || '';
		style.transitionDelay = transitionDelay || '0s';
		style.display = '';
		//display: noneと同時に実行するとtansitionが適用されないので非同期で;
		setTimeout(function() {style.opacity = this.defaultCSS.opacity;}.bind(this), 0);

		var transitionTime = getTransitionTime.apply(this);
		setTimeout(function() {
			style.opacity = '';
			style.transition = '';
		}, transitionTime);

		return transitionTime;
	}
	function hide(transitionDuration, transitionTimingFunction, transitionDelay, display) {
		//display: none なら処理を終了;
		if(!this.isDisplay()) {
			return 0;
		}

		var style = this.element.style;
		style.transitionProperty = 'opacity';
		style.transitionDuration = transitionDuration || '0.2s';
		style.transitionTimingFunction = transitionTimingFunction || '';
		style.transitionDelay = transitionDelay || '0s';
		style.opacity = '0';

		var transitionTime = getTransitionTime.apply(this);
		setTimeout(function() {
			if(!display) {
				style.display = 'none';
				style.opacity = '';
			}
			style.transition = '';
		}, transitionTime);

		return transitionTime;
	}

	return Animation;
})();