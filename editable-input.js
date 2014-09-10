/**
 * Allow to edit a resource property value in a REST application sending PUT requests
 *
 * eg:
 *    <h3 data-object="post" data-property="title" data-url="/posts/1">Title here</h3>
 *
 *    new EditableInput(document.querySelector('h3'));
 *
 * When you edit the value using double click without cancelling you send a request like:
 *
 * PUT /posts/1
 * post[title]=New title
 *
 * If the request is successfull it assumes the value has been saved
 *
 * @author Emilio Cobos <emilio@innovega.net>
 * TODO: Remove jQuery dependency
 */
(function(window, $, undefined) {
	var extend,
		innerText,
		trim,
		EditableInput;

	if ( String.prototype.trim ) {
		trim = function(str) {
			return str.trim();
		}
	} else {
		trim = function(str) {
			return str.replace(/(^\s+|\s+$)/g, '');
		}
	}

	extend = function(obj1, obj2) {
		var p;

		for ( p in obj2 ) {
			if ( obj2.hasOwnProperty(p) ) {
				obj1[p] = obj2[p];
			}
		}

		return obj1;
	}

	// https://github.com/duckinator/innerText-polyfill
	if( 'innerText' in document.createElement('a') ) {
		innerText = function(element) {
			return element.innerText;
		}
	} else {
		innerText = function(element) {
			var selection = window.getSelection(),
				ranges = [],
				count = selection.rangeCount,
				i = 0,
				content;
			for( ; i < count; i++ ) {
				ranges[i] = selection.getRangeAt(i);
			}

			selection.removeAllRanges();

			selection.selectAllChildren(element);

			content = selection.toString();

			selection.removeAllRanges();

			for( i = 0; i < count; i++ ) {
				selection.addRange(ranges[i]);
			}

			return content;
		}
	}

	/**
	 * @constructor
	 *
	 * @param {HTMLElement} element
	 * @param {Object} options (see default options in the prototype)
	 */
	EditableInput = function EditableInput(element, options) {
		if ( ! element ) {
			return;
		}

		extend(this.options, options || {});

		element._editableinput = this;

		this.element = element;
		this._value = this.getValue();
		this.url = element.getAttribute('data-url');
		this.object = element.getAttribute('data-object');
		this.method = element.getAttribute('data-property') || element.getAttribute('data-method');

		this.bindEvents();
	}

	extend(EditableInput.prototype, {
		/** Cancellation element */
		_cancelLink: null,

		/** Default options */
		options: {
			cancellable: true,
			cancelTime: 3000,
			cancelText: 'Cancelar',
			inputType: 'text', // text|textarea|custom
			onOpen: null,
			onCancel: null,
			onSave: null,
			onSaveError: null,
			onBeforeRequest: null
		},

		/**
		 * This allow different input types to be used
		 *
		 * @see EditableInput.registerType
		 */
		types: {},

		/**
		 * Use the correct function for the input type
		 *
		 * @return {String}
		 */
		getValue: function() {
			return trim(this.types[this.options.inputType].get(this.element));
		},

		/**
		 * Set the correct value for the input type
		 */
		setValue: function(val) {
			this.types[this.options.inputType].set(this.element, val)
		},

		/**
		 * Binds the events to the input (dblclick and blur)
		 */
		bindEvents: function() {
			var that = this;

			this.element.addEventListener('dblclick', function(e) {
				that.open();
			}, false);

			this.element.addEventListener('blur', function(e) {
				that.value = that.getValue();

				if( that._value !== that.value ) {
					that.save();
				}
			}, false);
		},

		/**
		 * Allows edition of the value
		 */
		open: function() {
			this.removeCancelLink();
			this.element.contentEditable = true;
			this._value = this.getValue();
			if ( this.options.onOpen ) {
				this.options.onOpen.call(this, this, element);
			}
			this.element.focus();
		},

		/**
		 * Send the request and save the value
		 *
		 * @param {Boolean} force
		 */
		save: function(force) {
			var that = this,
				data;

			if ( ! force && this.options.cancellable ) {
				this.element.contentEditable = false;
				this.createCancelLink();
				this._timeout = setTimeout(function() {
					that.save(true);
				}, this.options.cancelTime);
				return;
			}

			this.removeCancelLink();

			this.value = this.getValue();

			data = {};

			data[this.object] = {};

			data[this.object][this.method] = this.value;

			if( this.options.onBeforeRequest ) {
				this.options.onBeforeRequest.call(this, this, this.element);
			}

			$.ajax({
				url: this.url,
				method: 'PUT',
				dataType: 'json',
				data: data,
				context: this,
				success: function() {
					this.setValue(this.value);
					if ( this.options.onSave ) {
						this.options.onSave.call(this, this, element);
					}
				},
				error: function() {
					this.setValue(this._value);
					if ( this.options.onSaveError ) {
						this.options.onSaveError.call(this, this, element);
					}
				}
			});
		},

		/**
		 * Cancels the input
		 */
 		cancel: function() {
 			console.log('EditableInput#cancel');
 			clearTimeout(this._timeout);
 			this.removeCancelLink();
 			this.setValue(this._value);
 			if( this.options.onCancel ) {
 				this.options.onCancel.call(this, this, element);
 			}
 		},

 		/**
 		 * Creates the cancellation link
 		 */
		createCancelLink: function() {
			var that = this;

			if ( ! this._cancelLink ) {
				this._cancelLink = document.createElement('a');
				this._cancelLink.href = '#';
				this._cancelLink.className = 'js-inplace-cancel';
				this._cancelLink.innerHTML = this.options.cancelText;
				this._cancelLink.addEventListener('click', function(e) {
					that.cancel();
					e.preventDefault();
				}, false);
			}


			this.element.appendChild(this._cancelLink);
		},

		/**
		 * Removes the cancel link
		 */
		removeCancelLink: function() {
			this._cancelLink && this._cancelLink.parentNode &&	this._cancelLink.parentNode.removeChild(this._cancelLink);
		}
	});

	/**
	 * Register an input type
	 *
	 * @param {String} typeName
	 * @param {Object} setters two functions, one `get(element)`, and another `set(element, value)`
	 */
	EditableInput.registerType = function(typeName, setters) {
		EditableInput.prototype.types[typeName] = setters;
	}

	EditableInput.registerType('text', {
		get: function(element) {
			return element.textContent;
		},
		set: function(element, val) {
			element.textContent = val;
		}
	});

	EditableInput.registerType('textarea', {
		get: function(element) {
			return innerText(element);
		},
		set: function(element, val) {
			element.textContent = val;
		}
	});

	window.EditableInput = EditableInput;
} (window, window.jQuery))
