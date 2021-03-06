var WuhuSlideSystem = Class.create({

  reLayout:function()
  {
    $$('.reveal .slides>section').each(function(item){
      var cont = item.down("div.container");
      if (cont) cont.style.top = ((this.revealOptions.height - cont.getLayout().get("height")) / 2) + 'px';
    },this);
  },
  
  insertSlide:function( options )
  {
    var sec = new Element("section",options).update("<div class='container'></div>");
    sec.setStyle({
      width: this.revealOptions.width + "px",
      height: this.revealOptions.height + "px",
    });
    this.slideContainer.insert(sec);
    return sec;
  },

  reloadStylesheets:function() {
    var queryString = '?reload=' + new Date().getTime();
    $$('link[rel="stylesheet"]').each(function(item) {
      item.href = item.href.replace(/\?.*|$/, queryString);
    });
  },
    
  reloadSlideRotation:function()
  {
    // todo: if slide exist, replace. if not, create.
    var current = Reveal.getCurrentSlide() ? Reveal.getIndices( Reveal.getCurrentSlide() ).h : -1;
  
    this.slideContainer.update("");
    $H(this.slides).each(function(slide){
      var sec = this.slideContainer.down("section[data-slideimg='" + slide.value.url + "']");
      if (sec)
      {
        sec.down("div.container").update("");
      }
      else
      {
        sec = this.insertSlide({
          "data-slideimg": slide.value.url,
          "class": "rotationSlide",
        });
      }
      var cont = sec.down("div.container");
      var ext = slide.value.url.split('.').pop().toLowerCase();
      switch (ext)
      {
        case "jpg":
        case "gif":
        case "png":
        case "jpeg":
          {
            sec.addClassName( "image" );
            var img = new Element("img",{src:slide.value.url});
            cont.insert( img );
            var wuhu = this;
            img.observe("load",(function(){ this.reLayout(); }).bind(this));
          } break;
        case "txt":
        case "htm":
        case "html":
          {
            new Ajax.Request(slide.value.url + "?" + Math.random(),{
              "method":"GET",
              onSuccess:function(transport){
                sec.addClassName( "text" );
                cont.update( transport.responseText );
                this.reLayout();
              }
            });
          } break;
        case "ogv":
        case "mp4":
          {
            var video = new Element("video",{"muted":true});
            video.insert( new Element("source",{src:slide.value.url}) );
            video.observe("load",(function(){ this.reLayout(); }).bind(this));
            video.observe("loadedmetadata",(function(){ this.reLayout(); }).bind(this));
            sec.addClassName( "video" );
            cont.insert( video );
          } break;
      }
    },this);
    this.revealOptions.loop = true;
    Reveal.initialize( this.revealOptions );
  
    if (current >= 0)
    {
      console.log("[wuhu] navigating to " + current);
      Reveal.slide( current );
    }
    this.reLayout();
  },
  
  fetchSlideRotation:function()
  {
    new Ajax.Request("../slides/?allSlides=1",{
      "method":"GET",
      onSuccess:(function(transport){
        var e = new Element("root").update( transport.responseText );
        Element.select(e,"slide").each(function(slide){
          var o = {};
          o.url = slide.innerHTML;
          o.lastUpdate = slide.getAttribute("lastChanged");
          this.slides[o.url] = o;
        });
        Reveal.resumeAutoSlide();
        this.reloadSlideRotation();
      }).bind(this)
    });
  },
  
  updateCountdownTimer:function()
  {
    if (!$$(".countdownTimer").length) return;
  
    var timer = $$(".countdownTimer").first();
  
    // date.now / date.gettime? http://wholemeal.co.nz/blog/2011/09/09/chrome-firefox-javascript-date-differences/
    var sec = Math.floor( (this.countdownTimeStamp - Date.now()) / 1000 );
    if (sec < 0)
    {
      $$(".isStartingIn").first().update("will start");
      timer.update("soon");
      return;
    }
    $$(".isStartingIn").first().update( "will start in");
  
    var s = "";
    if (this.options.showHours) 
    {
      s = ("000" + (sec % 60)).slice(-2); sec = Math.floor(sec / 60);
      s = ("000" + (sec % 60)).slice(-2) + ":" + s; sec = Math.floor(sec / 60);
      s = ("" + (sec)) + ":" + s;
    }
    else
    {
      s = ("000" + (sec % 60)).slice(-2); sec = Math.floor(sec / 60);
      s = ("" + (sec)) + ":" + s;
    }
  
    timer.update( s );
  },
  
  fetchSlideEvents:function()
  {
    new Ajax.Request("../result.xml?" + Math.random(),{
      "method":"GET",
      onSuccess:(function(transport){
        var e = new Element("root").update( transport.responseText );
  
        this.slideContainer.update("");
  
        var mode = Element.down(e,"result > mode").innerHTML;
        switch(mode)
        {
          case "announcement":
            {
              var sec = this.insertSlide({"class":"announcementSlide"});
              var cont = sec.down("div.container");
              var text = Element.down(e,"result > announcementtext").innerHTML;
              var useHTML = Element.down(e,"result > announcementtext").getAttribute("isHTML") == "true";
              cont.update( useHTML ? text.unescapeHTML() : text.replace(/(?:\r\n|\r|\n)/g, '<br />') );
            } break;
          case "compocountdown":
            {
              var sec = this.insertSlide({"class":"countdownSlide"});
              var cont = sec.down("div.container");
  
              var openingText = "";
              if (Element.down(e,"result > componame"))
                openingText = "The " + Element.down(e,"result > componame").innerHTML + " compo";
              if (Element.down(e,"result > eventname"))
                openingText = Element.down(e,"result > eventname").innerHTML;
  
              var t = Element.down(e,"result > compostart").innerHTML;
              t = t.split(" ").join("T");
              
              function padNumberWithTwo(n)
              {
                return ("000" + n).slice(-2);
              }
              
              // this is where the fun starts!
              // http://gargaj.github.io/date-parsing-chrome-ff/
              
              var offset = new Date().getTimezoneOffset() * -1;
              if (offset > 0)
                t += "+" + padNumberWithTwo(offset / 60) + "" + padNumberWithTwo(offset % 60);
              else if (offset < 0)
                t += "-" + padNumberWithTwo(-offset / 60) + "" + padNumberWithTwo(-offset % 60);
              else if (offset == 0)
                t += "+0000";
              console.log(t);
              this.countdownTimeStamp = Date.parse( t );
  
              cont.insert( new Element("div",{"class":"eventName"}).update(openingText) );
              cont.insert( new Element("div",{"class":"isStartingIn"}).update("will start in") );
              cont.insert( new Element("div",{"class":"countdownTimer"}).update("0") );
              this.updateCountdownTimer();
  
            } break;
          case "compodisplay":
            {
              this.revealOptions.loop = false;
  
              var compoName = "";
              var compoNameFull = "";
              if (Element.down(e,"result > componame"))
              {
                compoName = Element.down(e,"result > componame").innerHTML;
                compoNameFull = "The " + compoName + " compo";
              }
              if (Element.down(e,"result > eventname"))
              {
                compoName = Element.down(e,"result > eventname").innerHTML;
                compoNameFull = compoName;
              }
  
              // slide 1: introduction
              var sec = this.insertSlide({"class":"compoDisplaySlide intro"});
              var cont = sec.down("div.container");
              cont.insert( new Element("div",{"class":"eventName"}).update(compoNameFull) );
              cont.insert( new Element("div",{"class":"willStart"}).update("will start") );
              cont.insert( new Element("div",{"class":"now"}).update("now!") );
  
              // slide 2..n: entries
  
              Element.select(e,"result > entries entry").each(function(entry){
                var sec = this.insertSlide({"class":"compoDisplaySlide entry"});
                sec.insert( new Element("div",{"class":"eventName"}).update(compoName) );
                var cont = sec.down("div.container");
                var fields = ["number","title","author","comment"];
                fields.each(function(field){
                  if ( Element.down(entry,field) )
            		  {
            		    var s = Element.down(entry,field).innerHTML;
            		    if (field == "comment")
                			s = s.replace(/(?:\r\n|\r|\n)/g, '<br />');
                    cont.insert( new Element("div",{"class":field}).update( s ) );
            		  }
                },this);
  
              },this);
  
              // slide n+1: end of compo
              var sec = this.insertSlide({"class":"compoDisplaySlide outro"});
              var cont = sec.down("div.container");
              cont.insert( new Element("div",{"class":"eventName"}).update(compoNameFull) );
              cont.insert( new Element("div",{"class":"is"}).update("is") );
              cont.insert( new Element("div",{"class":"over"}).update("over!") );
  
            } break;
          case "prizegiving":
            {
              this.revealOptions.loop = false;
  
              var compoName = Element.down(e,"result > componame").innerHTML;
              var compoNameFull = "The " + compoName + " compo";
  
              // slide 1: introduction
              var sec = this.insertSlide({"class":"prizegivingSlide intro"});
              var cont = sec.down("div.container");
              cont.insert( new Element("div",{"class":"header"}).update("Results") );
              cont.insert( new Element("div",{"class":"eventName"}).update(compoName) );
  
              // slide 2..n: entries
  
              Element.select(e,"result > results entry").each(function(entry){
                var sec = this.insertSlide({"class":"prizegivingSlide entry"});
                sec.insert( new Element("div",{"class":"eventName"}).update(compoName) );
                var cont = sec.down("div.container");
                var fields = ["ranking","title","author","points"];
                fields.each(function(field){
                  if ( Element.down(entry,field) )
                  {
                    var s = Element.down(entry,field).innerHTML;
                    if (field == "points") s += (s == 1) ? " pt" : " pts";
                    cont.insert( new Element("div",{"class":field}).update( s ) );
                  }
                },this);
  
              },this);
  
            } break;
        }
        Reveal.initialize( this.revealOptions );
        Reveal.slide( 0 );
        Reveal.pauseAutoSlide();
        this.reLayout();
      }).bind(this)
    });
  },
  
  initialize:function( opt )
  {
    this.options = {
      showHours: false,
      width: screen.width,
      height: screen.height,
    };
    Object.extend(this.options, opt || {} );

    this.slides = {};
  
    this.MODE_ROTATION = 1;
    this.MODE_EVENT = 2;
  
    this.slideMode = this.MODE_EVENT;
  
    this.countdownTimeStamp = null;
  
    this.slideContainer = $$(".reveal .slides").first();
    
    this.revealOptions = 
    {
      controls: false,
      progress: false,
      history: true,
      center: true,
      keyboard: false, // we disable Reveal's keyboard handling and use our own
    
      loop: true,
    
      autoSlide: 10000,
      autoSlideStoppable: false,
    
      width: this.options.width,
      height: this.options.height,
    
      margin: 0,
    
      transition: 'default',
      transitionSpeed: 'slow',
    
      // Optional libraries used to extend on reveal.js
      dependencies: []
    };
    
    
    if (this.slideMode == this.MODE_ROTATION)
      this.fetchSlideRotation();
    else
      this.fetchSlideEvents();
      
    var wuhu = this;
    new PeriodicalExecuter((function(pe) {
      if (this.slideMode == this.MODE_ROTATION)
        this.fetchSlideRotation();
    }).bind(this), 60);
    new PeriodicalExecuter((function(pe) {
      if (this.slideMode == this.MODE_EVENT)
        this.updateCountdownTimer();
      this.reLayout();
    }).bind(this), 0.5);
    document.observe("keyup",(function(ev){
      if (ev.keyCode == ' '.charCodeAt(0))
      {
        this.slideMode = this.MODE_EVENT;
        this.fetchSlideEvents();
        ev.stop();
      }
      if (ev.keyCode == 'S'.charCodeAt(0))
      {
        this.slideMode = this.MODE_ROTATION;
        this.fetchSlideRotation();
        ev.stop();
      }
      if (ev.keyCode == 'P'.charCodeAt(0))
      {
        if (!Reveal.autoSlidePaused)
          Reveal.pauseAutoSlide();
        else
          Reveal.resumeAutoSlide();
      }
      if (ev.keyCode == 'T'.charCodeAt(0))
      {
        this.reloadStylesheets();
        ev.stop();
      }
      if ($$(".countdownTimer").length)
      {
        if (ev.keyCode == Event.KEY_LEFT)
        {
          this.countdownTimeStamp -= 60 * 1000;
          this.updateCountdownTimer();
          ev.stop();
          return;
        }
        if (ev.keyCode == Event.KEY_RIGHT)
        {
          this.countdownTimeStamp += 60 * 1000;
          this.updateCountdownTimer();
          ev.stop();
          return;
        }
      }
      
      // default reveal stuff we disabled
			switch( ev.keyCode ) {
				case Event.KEY_LEFT: Reveal.navigateLeft(); ev.stop(); break;
				case Event.KEY_RIGHT: Reveal.navigateRight(); ev.stop(); break;
				case Event.KEY_HOME: Reveal.slide( 0 ); ev.stop(); break;
				case Event.KEY_END: Reveal.slide( Number.MAX_VALUE ); ev.stop(); break;
				case Event.KEY_ESC: { ev.stop(); Reveal.toggleOverview(); } break;
				case Event.KEY_RETURN: { ev.stop(); if (Reveal.isOverview()) Reveal.toggleOverview(); } break;
			}
			      
    }).bind(this));
  
    document.observe("slidechanged",(function(ev){
      var trans = "cube/page/concave/zoom/linear/fade".split("/");
      $$('.reveal .slides>section.rotationSlide').each(function(item){
        item.setAttribute("data-transition",trans[Math.floor(Math.random()*trans.length)]);
  
        var video = ev.currentSlide.down("video");
        if (video) video.play();
      });
      this.reLayout();
    }).bind(this));
    Event.observe(window, 'resize', (function() { this.reLayout(); }).bind(this));
  },
});

