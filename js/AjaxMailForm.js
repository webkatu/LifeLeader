(function() {

	var server = '/lifeleader/php/send_mail.php'; //送信先サーバーのURLを設定する;

	var xhr = new XMLHttpRequest();
	var form = document.getElementById('mail-form');
	var formHTML = form.innerHTML;
	var tempForm = {};

	form.onsubmit =  function(e){
		e.preventDefault();
		//多重送信を防止;
		var submit = form.querySelector('input[type="submit"]');
		submit.disabled = false;

		//formの内容を保存;
		(function() {
			var elements = form.elements;
			for(var i = 0; i < elements.length; i++) {
				tempForm[elements[i].name] = elements[i].value;
			}
		})();

		//サーバーにFormDataを送信;
		(function() {
			//FormDataを取得し、送信元サーバーを追加;
			var formData = new FormData(form);
			formData.append('from', location.host);

			xhr.open('POST', server);
			//カスタムヘッダーをつける;
			xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
			//結果はjsonだが、IEが対応していないのでtextで受け取る;
			xhr.responseType = 'text';
			xhr.timeout = '10000';
			xhr.send(formData);
		})();
	};

	xhr.addEventListener('loadend', function() {	
		//formのchildNodesを全て消す;
		(function removeAllChild(element) {
			var child;
			while(child = element.firstChild) {
				element.removeChild(child);
			}
		})(form);

		//送信後に表示する要素;
		var resultElements = (function createResultElements() {
			var elements = {};
			elements.df = document.createDocumentFragment();
			elements.p = document.createElement('p');
			elements.back = document.createElement('input');
			elements.back.type = 'button';
			elements.back.value = '戻る';
			elements.df.appendChild(elements.p);
			elements.df.appendChild(elements.back);

			return elements;
		})();
		form.appendChild(resultElements.df);

		if(xhr.status === 200) {
			var response = JSON.parse(xhr.response);
			if(response.result) {
				//メールが送信された時の処理;
				resultElements.p.textContent = '送信に成功しました。';
				resultElements.back.onclick = function() {
					form.innerHTML = formHTML;
				};
				return;
			}
		}
		//メールが送信されなかった時の処理;
		resultElements.p.textContent = '送信に失敗しました。再度送信してください。';
		resultElements.back.onclick = function() {
			form.innerHTML = formHTML;
			var elements = form.elements;
			for(var i = 0; i < elements.length; i++) {
				elements[i].value = tempForm[elements[i].name];
			}
		};
	}, false);
})();