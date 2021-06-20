'use strict';
const mysql = require('mysql');
const line = require('@line/bot-sdk');
const crypto = require('crypto');
const client = new line.Client({channelAccessToken: process.env.LINE_BOT_ACCESS_TOKEN});

exports.handler = async (event, context) => {
  let signature = crypto.createHmac('sha256', process.env.LINE_BOT_CHANNEL_SECRET).update(event.body).digest('base64');
  let checkHeader = (event.headers || {})['x-line-signature'];
      
  if (signature === checkHeader) {   
    let body = JSON.parse(event.body);
    let type = body.events[0].type;
    let botMessage = {
      'type': 'text',
      'text':  'メニューから選択してください'
    };
    
    if (type == "postback"){
      let sql="";
      let userId = body.events[0].source.userId;
      let postback = body.events[0].postback;
      let actionInfo = postback.data.split('&');
          
      if (actionInfo[0] == "buy"){
        sql = "SELECT COUNT(*) AS count from orders where userId = '"+userId+"';";
        let get_count = await runSql(sql);
        let count = get_count.body.count;

        if (count > 0){        
          botMessage = {
            'type': 'text',
            'text': "本日、既にご注文されています。\nご変更されたい場合は、一度注文を取り消してから再度ご注文願います"
          };
        }
        else{
          //購入者
          sql = "SELECT name FROM users WHERE userId ='"+userId+"';";
          let get_name = await runSql(sql);
          let order_name = get_name.body.name;
          //購入者の支店名
          sql = "SELECT branch FROM users WHERE userId ='"+userId+"';";
          let get_branch = await runSql(sql);
          let order_branch = get_branch.body.branch;
          let bento_name = actionInfo[1];
          // 実行するSQL文
          sql = "INSERT INTO orders(userID, branch, name ,bento_name) values ('"+userId+"','"+order_branch+"','"+order_name+"','"+bento_name+"');";
          runSql(sql);
          botMessage = {
            'type': 'text',
            'text': order_branch+"の"+order_name+"様\n「"+bento_name+"」の注文を受付いたしました"
          };  
        }
      }
    }
            
    if (type == "message") {
      let messageText = body.events[0].message.text;
      let userId = body.events[0].source.userId;
      let sql = "SELECT COUNT(*) AS count from users where userId = '"+userId+"';";
      let get_count = await runSql(sql);
      let count = get_count.body.count;

      if (count == 0){  
        botMessage = {
          type: "text",
          text: "最初に会員登録のため、「支店名、氏名」を入力してください\n（入力例）広島支店、山本浩二\n※支店名と氏名の間に、全角カンマ「、」を入れてください"
        };
      }
      else{
        if ( messageText == "照会" ){
          let sql="";
          sql = "SELECT name FROM users WHERE userId ='"+userId+"';";
          let get_name = await runSql(sql);
          let order_name = get_name.body.name;    
          sql = "SELECT COUNT(*) AS count from orders where userId = '"+userId+"';";
          let get_count = await runSql(sql);
          let count = get_count.body.count;    
          if (count > 0){
            sql = "SELECT bento_name FROM orders WHERE userId ='"+userId+"';";
            let get_bento_name = await runSql(sql);
            let bento_name = get_bento_name.body.bento_name;   
            botMessage = {
              'type': 'text',
              'text': "本日、"+order_name+"様は「"+bento_name+"」をご注文されています。\nなお、ご変更されたい場合は、一度注文を取り消してから再度ご注文願います"
            };
          }
          else{
            botMessage = {
              'type': 'text',
              'text': "本日、"+order_name+"様はまだご注文されていません。"
            };    
          }
        }
          
        if ( messageText == "取消" ){
          let sql = "SELECT COUNT(*) AS count from orders where userId = '"+userId+"';";
          let get_count = await runSql(sql);
          let count = get_count.body.count;
          if (count > 0){
            sql = "DELETE FROM orders WHERE userId='"+userId+"';";
            runSql(sql);
            botMessage = {
              'type': 'text',
              'text': '本日の注文をキャンセルしました'
            };
          }
          else{
            botMessage = {
              'type': 'text',
              'text': '本日はまだ注文されてません'
            };
          }      
        }
          
        if ( messageText == "登録変更" ){
          botMessage = {
            type: "text",
            text: "「支店名、氏名」を入力してください\n（入力例）広島支店、山本浩二\n※支店名と氏名の間に、全角カンマ「、」を入れてください"
          };
        }
          
        if ( messageText == "注文" ){
          let sql = "SELECT COUNT(*) AS count from orders where userId = '"+userId+"';";
          let get_count = await runSql(sql);
          let count = get_count.body.count;
          if (count > 0){
            sql = "SELECT name FROM users WHERE userId ='"+userId+"';";
            let get_name = await runSql(sql);
            let order_name = get_name.body.name;
            sql = "SELECT bento_name FROM orders WHERE userId ='"+userId+"';";
            let get_bento_name = await runSql(sql);
            let bento_name = get_bento_name.body.bento_name;
            botMessage = {
              'type': 'text',
              'text': order_name+"様、本日はすでに「"+bento_name+"」を注文されています。\n注文を変更されたい場合は、１度注文を取消してから再度ご注文をお願います"
            };
              
          }else
          {
            sql = "SELECT COUNT(*) AS count from menu";
            let get_count = await runSql(sql);
            let count = get_count.body.count;
            let bento_name = [""];
            let img_url = [""];
            let detail_url = [""];
            let columns = [];

            for (let i = 1; i < count+1; i++) {
              
              sql = "SELECT bento_name FROM menu WHERE id ="+i+";";
              let get_bento_name = await runSql(sql);
              bento_name.push(get_bento_name.body.bento_name);
                        
              sql = "SELECT img_url FROM menu WHERE id ="+i+";";
              let get_img_url = await runSql(sql);
              img_url.push(get_img_url.body.img_url);
              
              sql = "SELECT detail_url FROM menu WHERE id ="+i+";";
              let get_detail_url = await runSql(sql);
              detail_url.push(get_detail_url.body.detail_url);
        
              columns.push({  
                "thumbnailImageUrl": img_url[i],
                "imageBackgroundColor": "#FFFFFF",
                "title":bento_name[i],
                "text": "description",
                "defaultAction": {
                  "type": "uri",
                  "label": "詳細",
                  "uri": detail_url[i]
                },
                "actions": [
                  {
                  "type": "postback",
                  "label": "購入",
                  "data": "buy&"+bento_name[i]
                  },
                  {
                  "type": "uri",
                  "label": "詳細",
                  "uri": detail_url[i]
                  }
                ]
              });
            } //for            
            
            botMessage = {
              "type": "template",
              "altText": "this is a carousel template",
              "template": {
                "type": "carousel",
                "columns":columns,
                "imageAspectRatio": "rectangle",
                "imageSize": "cover"
              }//templete  
            };//botmessgge
          }// if (count > 0)
        }// if ( messageText == "注文" )
      }//if( count == 0)else
      
      
      if(messageText.indexOf('、') != -1){     
        let userInfo = messageText.split('、');
        let branch=userInfo[0];
        let name=userInfo[1];
        
        //初めてかどうか
        let sql = "SELECT COUNT(*) AS count from users where userId = '"+userId+"';";
        let get_count = await runSql(sql);
        let count = get_count.body.count;
        let str="";
        
        if (count > 0){
          sql = "UPDATE users SET name='" +name+ "',branch ='" +branch+"' WHERE userId ='" +userId+ "';";
          str = "変更";
        }
        else{
          // 実行するSQL文
          sql = "INSERT INTO users(userID, branch, name) values ('"+userId+"','"+branch+"','"+name+"');";
          str = "登録";
        }
        
        runSql(sql);
        botMessage = {
          'type': 'text',
          'text': "以下のとおり "+str+"しました。\n"+"支店名："+userInfo[0]+"\nお名前："+userInfo[1]
        };
      }
    }
    
    
    await client.replyMessage(body.events[0].replyToken, botMessage)
    .then((response) => { 
      let lambdaResponse = {
        statusCode: 200,
        headers: { "X-Line-Status" : "OK"},
        body: '{"result":"completed"}'
      };
      context.succeed(lambdaResponse);
    }).catch((err) => console.log(err));

 
  } //if (signature === checkHeader) 
  
}; //export.handler
 

function runSql(sql){
  return new Promise((resolve, reject) => {   
    const connection = mysql.createConnection({
      host     : 'rds-test.c3ooxjxnlroe.ap-northeast-1.rds.amazonaws.com', //RDSのエンドポイント
      user     : 'admin', //MySQLのユーザ名
      password : '93033Tatsuya', //MySQLのパスワード
      database : 'bento'
    });
    connection.connect();
    connection.query( sql, function (err, rows, fields) {
      if (err) throw err;
      const response = {
        body: rows[0]
      };
      //SQL文の答responseを返す
      resolve(response);
    });      
  });
}