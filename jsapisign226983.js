$(document).ready(function () {
  $("#jsapiSignForm").submit(function () {
    var e = decodeURIComponent($("#jsapiSignForm").serialize()).split("#")[0],
      s = new jsSHA(e, "TEXT"),
      t = s.getHash("SHA-1", "HEX");
    return $("#string1").text(e), $("#signature").text(t), !1;
  }),
    $("#jsapi_ticket").change(function () {
      var e = $("#jsapi_ticket").val(),
        s = $("#jsapi_ticket").parent().parent(),
        t = $("#jsapi_ticket_msg");
      $.ajax({
        url: "/debug/cgi-bin/ticket/check?ticket=" + e,
        success: function (e) {
          0 === e.errcode
            ? (s.removeClass("has-error"),
              s.addClass("has-success"),
              t.text(""))
            : 1 === e.errcode
            ? (s.removeClass("has-success"),
              s.addClass("has-error"),
              t.text("jsapi_ticket 已过期"))
            : -1 === e.errcode &&
              (s.removeClass("has-success"),
              s.addClass("has-error"),
              t.text("不是合法的 jsapi_ticket"));
        },
      });
    });
});
