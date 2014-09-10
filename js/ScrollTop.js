var $window = new Object();

$window.timer = null;
$window.scrollTop = function() {
	var y = window.pageYOffset;
	var _y = y / 10;
	var self = this;
	(function scroll() {
		if(window.pageYOffset === 0) {
			return;
		}
		scrollTo(0, y = y - _y);
		self.timer = setTimeout(scroll, 10);
	})();
};
$window.scrollStop = function() {
	clearTimeout(this.timer);
};

(function main() {
	var element = document.querySelector('.scroll-top');
	var animation = new Animation(element);

	if(window.pageYOffset === 0) {
		element.style.display = 'none';
	}
	window.addEventListener('scroll', function() {
		if(window.pageYOffset === 0) {
			animation.hide();
		}else {
			animation.show();
		}
	}, false);

	element.addEventListener('click', function(e) {
		e.preventDefault();
		$window.scrollTop();

		var mousewheel = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
		window.addEventListener(mousewheel, function listener(){
			$window.scrollStop();
			window.removeEventListener(mousewheel, listener, false);
		}, false);
	}, false);
})();