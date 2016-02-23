'use strict';
var Unionpay = require('unionpay');

/**------------------------unionpay start----------------------*/
//银联支付-网关支付-消费类交易，获取参数
exports.unionpay_getPCargs = function (req, res) {
    Helper.log('Unionpay getPCParams:');
    var txnAmt = 100;//金额，单位：分
    var orderno = '123456789';
    Unionpay.getPCargs(orderno, txnAmt, function (re) {
        res.send(re);
    });
};

//银联支付-app控件支付-消费类交易，获取参数
exports.unionpay_getAPPargs = function (req, res) {
    Helper.log('Unionpay getAPPargs:');
    var orderno = '123456789';
    var txnAmt = 100;//单位：分
    var goodsname = '测试商品名称';
    var orderDesc = goodsname.substring(0,7);//上送时可在控件内显示该信息，但仅用于控件显示，不会在商户和用户的对账单中出现。
    Unionpay.getAPPargs(orderno, txnAmt, orderDesc, function (re) {
        res.send(re);
    });
};

// 银联支付-网关支付-同步回调接口
exports.unionpay_return = function (req, res) {
    Helper.log('Unionpay return:');
    Helper.log(JSON.stringify(req.body));
    if (Unionpay.verify(req.body)) {
        //xxxxxxxxxx
        res.redirect('http://www.xxxxxx.com/profile/paydetail?orderno='+'123456789');
    } else {
        Helper.log("校验签名失败,signature:" + req.body.signature);
        //res.send({ err: 403 });//数据验证失败，签名验证失败
    }
};

//银联支付-网关支付-异步通知接口
exports.unionpay_notify = function (req, res) {
    Helper.log('Unionpay notify:');
    Helper.log(JSON.stringify(req.body));
    if (Unionpay.verify(req.body)) {
      //xxxxxxx  
      res.send('success');
    } else {
        Helper.log("校验签名失败,signature:" + req.body.signature);
        //res.send({ err: 403 });//数据验证失败，签名验证失败
    }
};

//银联支付-网关支付-查询订单
exports.unionpay_query = function (req, res) {
    Helper.log('Unionpay query:');
    //xxxxxx
};

/**------------------------unionpay end----------------------*/
