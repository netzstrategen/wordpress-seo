/* global YoastSEO, tinyMCE, wp, ajaxurl, wpseoPostScraperL10n, YoastShortcodePlugin, YoastReplaceVarPlugin, console */
(function( $ ) {
	'use strict';

	var currentKeyword = '';

	/**
	 * wordpress scraper to gather inputfields.
	 * @constructor
	 */
	var PostScraper = function() {
		if ( typeof CKEDITOR === 'object' ) {
			console.warn( 'YoastSEO currently doesn\'t support ckEditor. The content analysis currently only works with the HTML editor or TinyMCE.' );
		}

		this.prepareSlugBinding();
	};

	/**
	 * On a new post, WordPress doesn't include the slug editor, since a post has not been given a slug yet.
	 * As soon as a title is chosen, an `after-autosave.update-post-slug` event fires that triggers an AJAX request
	 * to the server to generate a slug. On the response callback a slug editor is inserted into the page on which
	 * we can bind our Snippet Preview.
	 *
	 * On existing posts, the slug editor is already there and we can bind immediately.
	 */
	PostScraper.prototype.prepareSlugBinding = function() {
		if ( document.getElementById( 'editable-post-name' ) === null ) {
			var that = this;
			jQuery( document ).on( 'after-autosave.update-post-slug', function() {
				that.bindSnippetCiteEvents( 0 );
			});
		} else {
			this.bindSlugEditor();
		}
	};

	/**
	 * When the `after-autosave.update-post-slug` event is triggered, this function checks to see if the slug editor has
	 * been inserted yet. If so, it does all of the necessary event binding. If not, it retries for a maximum of 5 seconds.
	 *
	 * @param {int} time
	 */
	PostScraper.prototype.bindSnippetCiteEvents = function( time ) {
		time = time || 0;
		var slugElem = document.getElementById( 'editable-post-name' );
		var titleElem = document.getElementById( 'title' );
		var postNameElem = document.getElementById('post_name');

		if ( slugElem !== null && titleElem.value !== '' ) {
			this.bindSlugEditor();

			// Always set the post name element.
			postNameElem.value = document.getElementById('editable-post-name-full').textContent;

			YoastSEO.app.snippetPreview.unformattedText.snippet_cite = document.getElementById('editable-post-name-full').textContent;
			YoastSEO.app.analyzeTimer();
		} else if ( time < 5000 ) {
			time += 200;
			setTimeout( this.bindSnippetCiteEvents.bind( this, time ), 200 );
		}
	};

	/**
	 * We want to trigger an update of the snippetPreview on a slug update. Because the save button is not available yet, we need to
	 * bind an event within the scope of a clickevent of the edit button.
	 */
	PostScraper.prototype.bindSlugEditor = function() {
		$( '#titlediv' ).on( 'change', '#new-post-slug', function() {
			YoastSEO.app.snippetPreview.unformattedText.snippet_cite = $( '#new-post-slug' ).val();
			YoastSEO.app.refresh();
		});
	};

	/**
	 * Get data from inputfields and store them in an analyzerData object. This object will be used to fill
	 * the analyzer and the snippetpreview
	 */
	PostScraper.prototype.getData = function() {
		return {
			keyword: this.getDataFromInput( 'keyword' ),
			meta: this.getDataFromInput( 'meta' ),
			text: this.getDataFromInput( 'text' ),
			title: this.getDataFromInput( 'title' ),
			url: this.getDataFromInput( 'url' ),
			excerpt: this.getDataFromInput( 'excerpt' ),
			snippetTitle: this.getDataFromInput( 'snippetTitle' ),
			snippetMeta: this.getDataFromInput( 'snippetMeta' ),
			snippetCite: this.getDataFromInput( 'cite' ),
			usedKeywords: wpseoPostScraperL10n.keyword_usage,
			searchUrl: '<a target="_blank" href=' + wpseoPostScraperL10n.search_url + '>',
			postUrl: '<a target="_blank" href=' + wpseoPostScraperL10n.post_edit_url + '>'
		};
	};

	/**
	 * gets the values from the given input. Returns this value
	 * @param {String} inputType
	 * @returns {String}
	 */
	PostScraper.prototype.getDataFromInput = function( inputType ) {
		var newPostSlug, val = '';
		switch ( inputType ) {
			case 'text':
			case 'content':
				val = this.getContentTinyMCE();
				break;
			case 'cite':
			case 'url':
				newPostSlug = $( '#new-post-slug' );
				if ( 0 < newPostSlug.length ) {
					val = newPostSlug.val();
				}
				else if ( document.getElementById( 'editable-post-name-full' ) !== null ) {
					val = document.getElementById( 'editable-post-name-full' ).textContent;
				}
				break;
			case 'meta':
				val = document.getElementById( 'yoast_wpseo_metadesc' ) && document.getElementById( 'yoast_wpseo_metadesc' ).value || '';
				break;
			case 'snippetMeta':
				val = document.getElementById( 'yoast_wpseo_metadesc' ) && document.getElementById( 'yoast_wpseo_metadesc' ).value || '';
				break;
			case 'keyword':
				val = document.getElementById( 'yoast_wpseo_focuskw_text_input' ) && document.getElementById( 'yoast_wpseo_focuskw_text_input' ).value || '';
				currentKeyword = val;
				break;
			case 'title':
				val = document.getElementById( 'title' ) && document.getElementById( 'title' ).value || '';
				break;
			case 'snippetTitle':
				val = document.getElementById( 'yoast_wpseo_title' ) && document.getElementById( 'yoast_wpseo_title' ).value || '';
				break;
			case 'excerpt':
				if ( document.getElementById( 'excerpt' ) !== null ) {
					val = document.getElementById('excerpt') && document.getElementById('excerpt').value || '';
				}
				break;
			default:
				break;
		}
		return val;
	};

	/**
	 * When the snippet is updated, update the (hidden) fields on the page
	 * @param {Object} value
	 * @param {String} type
	 */
	PostScraper.prototype.setDataFromSnippet = function( value, type ) {
		switch ( type ) {
			case 'snippet_meta':
				document.getElementById( 'yoast_wpseo_metadesc' ).value = value;
				break;
			case 'snippet_cite':
				document.getElementById( 'post_name' ).value = value;
				if ( document.getElementById( 'editable-post-name' ) !== null ) {
					document.getElementById( 'editable-post-name' ).textContent = value;
					document.getElementById( 'editable-post-name-full' ).textContent = value;
				}
				break;
			case 'snippet_title':
				document.getElementById( 'yoast_wpseo_title' ).value = value;
				break;
			default:
				break;
		}
	};

	/**
	 * The data passed from the snippet editor.
	 *
	 * @param {Object} data
	 * @param {string} data.title
	 * @param {string} data.urlPath
	 * @param {string} data.metaDesc
	 */
	PostScraper.prototype.saveSnippetData = function( data ) {
		this.setDataFromSnippet( data.title, 'snippet_title' );
		this.setDataFromSnippet( data.urlPath, 'snippet_cite' );
		this.setDataFromSnippet( data.metaDesc, 'snippet_meta' );
	};

	/**
	 * Returns the value of the contentfield. If tinyMCE isn't initialized, or has no editors
	 * or is hidden it gets it's contents from getTinyMCEElementContent.
	 * @returns {String}
	 */
	PostScraper.prototype.getContentTinyMCE = function() {
		if ( typeof tinyMCE === 'undefined' || typeof tinyMCE.editors === 'undefined' || tinyMCE.editors.length === 0 || tinyMCE.get( 'content' ).isHidden() ) {
			return this.getTinyMCEElementContent();
		}
		return tinyMCE.get( 'content' ).getContent();
	};

	/**
	 * Gets content from the contentfield.
	 *
	 * @returns {String}
	 */
	PostScraper.prototype.getTinyMCEElementContent = function() {
		return document.getElementById( 'content' ) && document.getElementById( 'content' ).value || '';
	};

	/**
	 * Calls the eventbinders.
	 */
	PostScraper.prototype.bindElementEvents = function( app ) {
		this.inputElementEventBinder( app );
		document.getElementById( 'yoast_wpseo_focuskw_text_input' ).addEventListener( 'keydown', app.snippetPreview.disableEnter );
		document.getElementById( 'yoast_wpseo_focuskw_text_input' ).addEventListener( 'keyup', this.updateKeywordUsage );
	};

	/**
	 * binds the renewData function on the change of inputelements.
	 */
	PostScraper.prototype.inputElementEventBinder = function( app ) {
		var elems = [ 'excerpt', 'content', 'yoast_wpseo_focuskw_text_input', 'title' ];
		for ( var i = 0; i < elems.length; i++ ) {
			var elem = document.getElementById( elems[ i ] );
			if ( elem !== null ) {
				document.getElementById( elems[ i ] ).addEventListener( 'input', app.analyzeTimer.bind( app ) );
			}
		}

		if( typeof tinyMCE !== 'undefined' && typeof tinyMCE.on === 'function' ) {
			//binds the input, change, cut and paste event to tinyMCE. All events are needed, because sometimes tinyMCE doesn'
			//trigger them, or takes up to ten seconds to fire an event.
			var events = [ 'input', 'change', 'cut', 'paste' ];
			tinyMCE.on( 'addEditor', function( e ) {
				for ( var i = 0; i < events.length; i++ ) {
					e.editor.on( events[i], app.analyzeTimer.bind( app ) );
				}
			});
		}
		document.getElementById( 'yoast_wpseo_focuskw_text_input' ).addEventListener( 'blur', this.resetQueue );
	};

	/**
	 * Resets the current queue if focus keyword is changed and not empty.
	 */
	PostScraper.prototype.resetQueue = function() {
		if ( YoastSEO.app.rawData.keyword !== '' ) {
			YoastSEO.app.runAnalyzer( this.rawData );
		}
	};

	/**
	 * Saves the score to the linkdex.
	 * Outputs the score in the overall target.
	 *
	 * @param {string} score
	 */
	PostScraper.prototype.saveScores = function( score ) {
		var alt;
		var cssClass;

		if ( this.isMainKeyword( currentKeyword ) ) {
			document.getElementById( 'yoast_wpseo_linkdex' ).value = score;

			if ( '' === currentKeyword ) {
				cssClass = 'na';
			} else {
				cssClass = YoastSEO.app.scoreFormatter.overallScoreRating( parseInt( score, 10 ) );
			}
			alt = YoastSEO.app.scoreFormatter.getSEOScoreText( cssClass );

			$( '.yst-traffic-light' )
				.attr( 'class', 'yst-traffic-light ' + cssClass )
				.attr( 'alt', alt );
		}

		// If multi keyword isn't available we need to update the first tab (content)
		if ( ! YoastSEO.multiKeyword ) {
			this.updateKeywordTabContent( currentKeyword, score );
		}

		jQuery( window ).trigger( 'YoastSEO:numericScore', score );
	};

	/**
	 * Returns whether or not the keyword is the main keyword
	 *
	 * @param {string} keyword The keyword to check
	 *
	 * @returns {boolean}
	 */
	PostScraper.prototype.isMainKeyword = function( keyword ) {
		var firstTab, mainKeyword;

		firstTab = $( '.wpseo_keyword_tab' )
			.first()
			.find( '.wpseo_tablink' );

		mainKeyword = firstTab.data( 'keyword' );

		return keyword === mainKeyword;
	};

	/**
	 * Initializes keyword tab with the correct template if multi keyword isn't available
	 */
	PostScraper.prototype.initKeywordTabTemplate = function() {
		var keyword, score;

		// If multi keyword is available we don't have to initialize this as multi keyword does this for us.
		if ( YoastSEO.multiKeyword ) {
			return;
		}

		// Remove default functionality to prevent scrolling to top.
		$( '.wpseo-metabox-tabs' ).on( 'click', '.wpseo_tablink', function( ev ) {
			ev.preventDefault();
		});

		keyword = $( '#yoast_wpseo_focuskw' ).val();
		score   = $( '#yoast_wpseo_linkdex' ).val();

		$( '#yoast_wpseo_focuskw_text_input' ).val( keyword );

		this.updateKeywordTabContent( keyword, score );
	};

	/**
	 * Updates keyword tab with new content
	 */
	PostScraper.prototype.updateKeywordTabContent = function( keyword, score ) {
		var placeholder, keyword_tab;

		score = parseInt( score, 10 );

		if ( typeof keyword === 'undefined' || keyword === '' ) {
			score = 'na';
		}
		placeholder = keyword && keyword.length > 0 ? keyword : '...';

		score = YoastSEO.ScoreFormatter.prototype.overallScoreRating( score );

		keyword_tab = wp.template( 'keyword_tab' )({
			keyword: keyword,
			placeholder: placeholder,
			score: score,
			hideRemove: true,
			prefix: wpseoPostScraperL10n.contentTab + ' ',
			active: true
		});

		$( '#yoast_wpseo_focuskw' ).val( keyword );

		$( '.wpseo_keyword_tab' ).replaceWith( keyword_tab );
	};

	/**
	 * updates the focus keyword usage if it is not in the array yet.
	 */
	PostScraper.prototype.updateKeywordUsage = function() {
		var keyword = this.value;
		if ( typeof( wpseoPostScraperL10n.keyword_usage[ keyword ] === null ) ) {
			jQuery.post(ajaxurl, {
					action: 'get_focus_keyword_usage',
					post_id: jQuery('#post_ID').val(),
					keyword: keyword
				}, function( data ) {
					if ( data ) {
						wpseoPostScraperL10n.keyword_usage[ keyword ] = data;
						YoastSEO.app.analyzeTimer();
					}
				}, 'json'
			);
		}
	};

	/**
	 * binds to the WordPress jQuery function to put the permalink on the page.
	 * If the response matches with permalinkstring, the snippet can be rerendered.
	 */
	jQuery( document ).on( 'ajaxComplete', function( ev, response, ajaxOptions ) {
		var ajax_end_point = '/admin-ajax.php';
		if ( ajax_end_point !== ajaxOptions.url.substr( 0 - ajax_end_point.length ) ) {
			return;
		}

		if ( 'string' === typeof ajaxOptions.data && false !== ajaxOptions.data.indexOf( 'action=sample-permalink' ) ) {
			YoastSEO.app.callbacks.getData();
			YoastSEO.app.runAnalyzer();
			YoastSEO.app.snippetPreview.reRender();
		}
	} );

	jQuery( document ).ready(function() {
		var postScraper = new PostScraper();

		YoastSEO.analyzerArgs = {
			//if it must run the analyzer
			analyzer: true,
			//if it uses ajax to get data
			ajax: true,
			//if it must generate snippetpreview
			snippetPreview: true,
			//element Target Array
			elementTarget: ['content', 'yoast_wpseo_focuskw_text_input', 'yoast_wpseo_metadesc', 'excerpt', 'editable-post-name', 'editable-post-name-full'],
			//replacement target array, elements that must trigger the replace variables function.
			replaceTarget: ['yoast_wpseo_metadesc', 'excerpt', 'yoast_wpseo_title'],
			//rest target array, elements that must be reset on focus
			resetTarget: ['snippet_meta', 'snippet_title', 'snippet_cite'],
			//typeDelay is used as the timeout between stopping with typing and triggering the analyzer
			typeDelay: 300,
			//Dynamic delay makes sure the delay is increased if the analyzer takes longer than the default, to prevent slow systems.
			typeDelayStep: 100,
			maxTypeDelay: 1500,
			dynamicDelay: true,
			//used for multiple keywords (future use)
			multiKeyword: false,
			//targets for the objects
			targets: {
				output: 'wpseo-pageanalysis',
				snippet: 'wpseosnippet'
			},
			translations: wpseoPostScraperL10n.translations,
			queue: ['wordCount',
				'keywordDensity',
				'subHeadings',
				'stopwords',
				'fleschReading',
				'linkCount',
				'imageCount',
				'urlKeyword',
				'urlLength',
				'metaDescription',
				'pageTitleKeyword',
				'pageTitleLength',
				'firstParagraph',
				'keywordDoubles'],
			usedKeywords: wpseoPostScraperL10n.keyword_usage,
			searchUrl: '<a target="_blank" href=' + wpseoPostScraperL10n.search_url + '>',
			postUrl: '<a target="_blank" href=' + wpseoPostScraperL10n.post_edit_url + '>',
			callbacks: {
				getData: postScraper.getData.bind( postScraper ),
				bindElementEvents: postScraper.bindElementEvents.bind( postScraper ),
				saveScores: postScraper.saveScores.bind( postScraper ),
				saveSnippetData: postScraper.saveSnippetData.bind( postScraper )
			},
			locale: wpseoPostScraperL10n.locale
		};

		// If there are no translations let the analyzer fallback onto the english translations.
		if (0 === wpseoPostScraperL10n.translations.length) {
			delete( YoastSEO.analyzerArgs.translations );
		} else {
			// Make sure the correct text domain is set for analyzer.
			var translations = wpseoPostScraperL10n.translations;
			translations.domain = 'js-text-analysis';
			translations.locale_data['js-text-analysis'] = translations.locale_data['wordpress-seo'];
			delete( translations.locale_data['wordpress-seo'] );
			YoastSEO.analyzerArgs.translations = translations;
		}

		var placeholder = { urlPath:  '' };

		var titlePlaceholder = wpseoPostScraperL10n.title_template;
		if (titlePlaceholder === '' ) {
			titlePlaceholder = '%%title%% - %%sitename%%';
		}
		placeholder.title = titlePlaceholder;

		var metaPlaceholder = wpseoPostScraperL10n.metadesc_template;
		if (metaPlaceholder !== '' ) {
			placeholder.metaDesc = metaPlaceholder;
		}

		var data = postScraper.getData();

		YoastSEO.analyzerArgs.snippetPreview = new YoastSEO.SnippetPreview({
			targetElement: document.getElementById( 'wpseosnippet' ),
			placeholder: placeholder,
			baseURL: wpseoPostScraperL10n.base_url,
			callbacks: {
				saveSnippetData: postScraper.saveSnippetData.bind( postScraper )
			},
			metaDescriptionDate: wpseoPostScraperL10n.metaDescriptionDate,
			data: {
				title: data.snippetTitle,
				urlPath: data.snippetCite,
				metaDesc: data.snippetMeta
			}
		});

		window.YoastSEO.app = new YoastSEO.App( YoastSEO.analyzerArgs );
		jQuery( window).trigger( 'YoastSEO:ready' );

		//Init Plugins
		new YoastReplaceVarPlugin();
		new YoastShortcodePlugin();

		postScraper.initKeywordTabTemplate();
	} );
}( jQuery ));
