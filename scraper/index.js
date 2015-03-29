var express = require('express');
var cheerio = require('cheerio');
var superagent = require('superagent');
var url = require('url');
var eventProxy = require('eventproxy');

var app = express();

var APP_PORT = 3002;


app.get('/dict', function (req, res) {
    superagent.get('http://cn.bing.com/dict/')
        .end(function (e, src) {
            if(e) {
                console.log(e);
                return e;
            }

            var $ = cheerio.load(src.text);
            var abstract = [];
            $('div.client_daily_news_imp_item').each(function (i, e) {
                var aWord = {};
                aWord.word = $(e).children('.client_daily_news_imp_word').children('a').text();
                aWord.meaningInChinese = $(e).children('.client_daily_news_imp_def').text();
                aWord.pronunciation = $(e).children('.client_daily_news_imp_pn').text();
                var wordLink = $(e).children('.client_daily_news_imp_word').children('a').attr('href');
                aWord.link = url.resolve('http://cn.bing.com/', wordLink);
                abstract.push(aWord);
            });

            var ep = new eventProxy();
            ep.after('sentence', abstract.length, function () {
                res.send(abstract);
            });

            abstract.forEach(function (e, i , a) {
                var _word = e;
                var link = e.link;

                superagent.get(link)
                    .end(function (e, src) {
                        if(e) {
                            console.log(_word+'\n'+e);
                            return e;
                        }

                        var $ = cheerio.load(src.text);

                        _word.sentences = [];
                        $('.se_li .se_li1').each(function (i, e) {
                                
                                var element = $(e);
                                var sentence = {
                                    en: '',
                                    cn: ''
                                };
                                element.children('.sen_en').children().each(function (i, e) {
                                    sentence.en += $(e).text();
                                });
                                element.children('.sen_cn').children().each(function (i, e) {
                                    sentence.cn += $(e).text();
                                });
                                _word.sentences.push(sentence);
                        });  
                        ep.emit('sentence');                      
                    });
            });
        });
});

app.listen(APP_PORT, function () {
    console.log('a scraper is listening at port '+APP_PORT);
});