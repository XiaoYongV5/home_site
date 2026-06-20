$(function(){
  console.log("%c 🌟✨🚀 本网站由 潇十一郎 提供技术支持 🚀✨🌟","font-size:3em");
  console.log("%c站长QQ：1064938480",
      " text-shadow: 0 1px 0 #ccc,0 2px 0 #c9c9c9,0 3px 0 #bbb,0 4px 0 #b9b9b9,0 5px 0 #aaa,0 6px 1px rgba(0,0,0,.1),0 0 5px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.3),0 3px 5px rgba(0,0,0,.2),0 5px 10px rgba(0,0,0,.25),0 10px 10px rgba(0,0,0,.2),0 20px 20px rgba(0,0,0,.15);font-size:4em"
  );
        document.oncontextmenu = function () {
            layer.msg('右键不出来了吧');
            return false;
        };
        document.onkeydown = function(e) {
            if (window.event && window.event.keyCode == 123) {
                layer.msg('老弟，你这是想看什么？');
                event.keyCode = 0;
                event.returnValue = false;
                return false;
            }
        };
})