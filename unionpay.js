'use strict'
var util = require('util');
var request = require('request');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var iconv = require("iconv-lite");
var Helper = require('../Helper');

var Unionpay = function () { };

Unionpay.version = '5.0.0';//版本号，固定填写5.0.0
Unionpay.encoding = 'UTF-8';
Unionpay.signMethod = "01";//01：表示采用RSA,固定填写：01
Unionpay.txnType = "01";//固定填写：01
Unionpay.txnSubType = "01";//固定填写：01
Unionpay.bizType = "000201";//产品类型，000201：B2C网关支付
Unionpay.accessType = "0";//0：商户直连接入1：收单机构接入
Unionpay.frontUrl = 'http://www.xxx.com/unionpay_return';//前台通知地址，前台返回商户结果时使用，例：https://xxx.xxx.com/xxx
Unionpay.backUrl = 'http://www.xxx.com/unionpay_notify';//后台通知地址
Unionpay.currencyCode = '156';//交易币种，币种格式必须为3位代码，境内客户取值：156（人民币） 固定填写：156

//Unionpay.frontTransUrl = "https://101.231.204.80:5000/gateway/api/frontTransReq.do";//前台交易请求地址
//Unionpay.appTransUrl = "https://101.231.204.80:5000/gateway/api/appTransReq.do";//APP交易请求地址
//Unionpay.backTransUrl = "https://101.231.204.80:5000/gateway/api/backTransReq.do";//后台交易请求地址
//Unionpay.cardTransUrl = "https://101.231.204.80:5000/gateway/api/cardTransReq.do";//后台交易请求地址(若为有卡交易配置该地址)：
//Unionpay.queryTransUrl = "https://101.231.204.80:5000/gateway/api/queryTrans.do";//单笔查询请求地址
//Unionpay.batchTransUrl = "https://101.231.204.80:5000/gateway/api/batchTrans.do";//批量查询请求地址
Unionpay.frontTransUrl = "https://gateway.95516.com/gateway/api/frontTransReq.do";//前台交易请求地址
Unionpay.appTransUrl = "https://gateway.95516.com/gateway/api/appTransReq.do";//APP交易请求地址
Unionpay.backTransUrl = "https://gateway.95516.com/gateway/api/backTransReq.do";//后台交易请求地址
Unionpay.cardTransUrl = "https://gateway.95516.com/gateway/api/cardTransReq.do";//后台交易请求地址(若为有卡交易配置该地址)：
Unionpay.queryTransUrl = "https://gateway.95516.com/gateway/api/queryTrans.do";//单笔查询请求地址
Unionpay.batchTransUrl = "https://gateway.95516.com/gateway/api/batchTrans.do";//批量查询请求地址
Unionpay.TransUrl = "https://filedownload.95516.com/";//文件传输类交易地址
Unionpay.merId = 'xxxxxxxxxx';//测试商户号，已被批准加入银联互联网系统的商户代码
//Unionpay.certId = 'xxxxxxxxxxxxxxxxxxxxxxxx';//填写签名私钥证书的Serial Number，该值可通过SDK获取,测试环境
Unionpay.certId = 'xxxxxxxxxxxxxxx';//填写签名私钥证书的Serial Number，生产环境


//var privateKey = fs.readFileSync(path.resolve(__dirname, '../bin/acp700000000000001.pem')); //商户测试私钥,使用openssl从pfx文件中生成并去除密码
var privateKey = fs.readFileSync(path.resolve(__dirname, '../bin/acp_pro_sign.pem')); //生产环境
//var publicKey = fs.readFileSync(path.resolve(__dirname, '../bin/acp20151027.cer')); //银联测试公钥
var publicKey = fs.readFileSync(path.resolve(__dirname, '../bin/acp20151027.cer')); //银联生产环境公钥

// orderId: 订单号
// txnAmt: 付款金额,单位为分，例：1元填写100
// txnTime: 订单发送时间
Unionpay.buildParams = function (orderId, txnAmt, orderDesc, channelType, frontUrl) {
    var d = new Date();
    var ps = {
        version: Unionpay.version,
        encoding: Unionpay.encoding,
        signMethod: Unionpay.signMethod,
        txnType: Unionpay.txnType,
        txnSubType: Unionpay.txnSubType,
        bizType: Unionpay.bizType,
        accessType: Unionpay.accessType,
        backUrl: Unionpay.backUrl,
        currencyCode: Unionpay.currencyCode,
        merId: Unionpay.merId,
        orderId: orderId,
        txnAmt: txnAmt+'',
        txnTime: d.format('yyyyMMddhhmmss'),//商户发送交易时间，例：20151118100505
        payTimeout: new Date(d.setMinutes(d.getMinutes()+15)).format('yyyyMMddhhmmss'),//超过此时间用户支付成功的交易，不通知商户，系统自动退款，大约5个工作日金额返还到用户账户
        certId: Unionpay.certId//填写签名私钥证书的Serial Number，该值可通过SDK获取,测试环境
    };
    if (orderDesc) {
        ps.orderDesc = orderDesc;
    }
    ps.channelType = channelType;
    if (frontUrl) {
        ps.frontUrl = frontUrl;
    }

    var prestr = Unionpay.createLinkString(ps, true);
    var gbkBytes = iconv.encode(prestr,'utf-8');
    prestr = gbkBytes;

    //sha1
    var sha1 = crypto.createHash('sha1');
    sha1.update(prestr, 'utf8');
    var ss1 = sha1.digest('hex');

    //私钥签名
    var sign = crypto.createSign('RSA-SHA1');
    sign.update(ss1);
    var sig = sign.sign(privateKey, 'base64');
    ps.signature = sig;
    return ps;
};

//验签
Unionpay.verify = function (params) {
    var signature_str = params.signature;
    params = Unionpay.filterPara(params);
    Helper.log("返回的服务器签名：" + signature_str);
    var prestr = Unionpay.createLinkString(params, false);

    var gbkBytes = iconv.encode(prestr,'utf-8');
    prestr = gbkBytes;

    //sha1
    var sha1 = crypto.createHash('sha1');
    sha1.update(prestr);
    var ss1 = sha1.digest('hex');

    //公钥验签
    var verifier = crypto.createVerify("RSA-SHA1");
    verifier.update(ss1);
    var vs = verifier.verify(publicKey, signature_str, "base64");

    return vs;
};

Unionpay.createLinkString = function (params, encode) {
    var str = '', ks = Object.keys(params).sort();
    for (var i = 0; i < ks.length; i++) {
        var k = ks[i];
        if (encode == true) {
            k = encodeURIComponent(k);
        }
        if (str.length > 0) {
            str += '&';
        }
        if (k!=null && k!=undefined && k!='') {//如果参数的值为空不参与签名；
            str += k + '=' + params[k];
        }
    }
    return str;
};


Unionpay.filterPara = function (params) {
    var obj = {};
    for (var k in params) { 
        var _k = k;
        if (_k != 'signature' && params[k]) {
            obj[k] = params[k];
        }
    }
    return obj;
};

//银联支付-网关支付-消费类交易，获取参数
Unionpay.getPCargs = function (orderno, txnAmt, callbackFun) {
    var frontUrl = Unionpay.frontUrl;
    var channelType = '07';//05：语音 07：互联网 08：移动
    var reqdata = Unionpay.buildParams(orderno, txnAmt, null, channelType, frontUrl);
    callbackFun(reqdata);
};
//银联支付-app控件支付-消费类交易，获取参数
Unionpay.getAPPargs = function (orderno, txnAmt, orderDesc, callbackFun) {
    var channelType = '08';//05：语音 07：互联网 08：移动
    var reqdata = Unionpay.buildParams(orderno, txnAmt, orderDesc, channelType, null);
    request.post(Unionpay.appTransUrl,
        {
            form: {
                "version": reqdata.version,
                "encoding": reqdata.encoding,
                "signMethod": reqdata.signMethod,
                "txnType": reqdata.txnType,
                "txnSubType": reqdata.txnSubType,
                "bizType": reqdata.bizType,
                "accessType": reqdata.accessType,
                "backUrl": reqdata.backUrl,
                "currencyCode": reqdata.currencyCode,
                "merId": reqdata.merId,
                "orderId": reqdata.orderId,
                "txnAmt": reqdata.txnAmt,
                "txnTime": reqdata.txnTime,
                "payTimeout": reqdata.payTimeout,
                "certId": reqdata.certId,
                "orderDesc": reqdata.orderDesc,
                "channelType": reqdata.channelType,
                "signature": reqdata.signature
            }
        }, function (error, response, body) {
            if (callbackFun) {
                Helper.log('-----------body:'+body);
                if (!error && response && response.statusCode == 200) {
                    var tn = null;
                    var s = body.split('&');
                    for (var i in s){
                        var a = s[i];
                        var k = a.split('=');
                        if( k[0]=='tn'){
                            tn = k[1]||null;
                            break;
                        }
                    }
                    callbackFun({tn:tn});
                } else {
                    callbackFun({tn:null});
                }
            }
        });
};

//银联支付-网关支付-查询订单
Unionpay.queryOrder = function (queryId, callbackFun) {
    var ps = {
        version: Unionpay.version,
        encoding: Unionpay.encoding,
        signMethod: Unionpay.signMethod,
        txnType: Unionpay.txnType,
        txnSubType: Unionpay.txnSubType,
        bizType: Unionpay.bizType,
        accessType: Unionpay.accessType,
        merId: Unionpay.merId,
        queryId: queryId,
        certId: Unionpay.certId//填写签名私钥证书的Serial Number，该值可通过SDK获取,测试环境
    };
    var prestr = Unionpay.createLinkString(ps, true);
    var gbkBytes = iconv.encode(prestr,'utf-8');
    prestr = gbkBytes;

    //sha1
    var sha1 = crypto.createHash('sha1');
    sha1.update(prestr, 'utf8');
    var ss1 = sha1.digest('hex');

    //私钥签名
    var sign = crypto.createSign('RSA-SHA1');
    sign.update(ss1);
    var sig = sign.sign(privateKey, 'base64');
    ps.signature = sig;

    request.post(Unionpay.queryTransUrl,
        {
            form: {
                "version": ps.version,
                "encoding": ps.encoding,
                "signMethod": ps.signMethod,
                "txnType": ps.txnType,
                "txnSubType": ps.txnSubType,
                "bizType": ps.bizType,
                "accessType": ps.accessType,
                "merId": ps.merId,
                "queryId": ps.queryId,
                "certId": ps.certId,
                "signature": ps.signature
            }
        }, function (error, response, body) {
            if (callbackFun) {
                if (!error && response && response.statusCode == 200) {
                    callbackFun({origRespCode:body.origRespCode});
                } else {
                    callbackFun(null);
                }
            }
        });
};

module.exports = Unionpay;
