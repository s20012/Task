"use strict";

const sqlite3 = require("sqlite3");
const express = require('express');

const fs = require('fs');
const ejs = require('ejs');
const qs = require('querystring');

const app = express();
const port = 3000;

// データベースのパスは決まっているので定数として宣言する
const db_path = './test.db';

const server = app.listen(port, function () {
    console.log("listening at port %s", server.address().port);
});

const index_ejs = fs.readFileSync('./views/index.ejs','utf8');

app.get('/', (req, res) => GetResponseIndex(req, res));

app.get('/index.html', (req, res) => GetResponseIndex(req, res));

function GetResponseIndex(req, res){
    const db = new sqlite3.Database(db_path);

    db.all("select * from table.db", (error, rows) => {
        let content =    ejs.render(index_ejs, {rows: rows});

        res.writeHead(200, {'Content-Type':'text/html'});
        res.write(content);
        res.end();
    });
    db.close();
}

const new_update_ejs = fs.readFileSync('./views/new_update.ejs','utf8');

app.get('/newpost', (req, res) => {
    let content =    ejs.render(new_update_ejs, { new_update: '新規投稿' ,action: './newpost', oldname: '名無しさん', oldbody: ''});

    res.writeHead(200, {'Content-Type':'text/html'});
    res.write(content);
    res.end();
});


const err_ejs = fs.readFileSync('./views/err.ejs','utf8');

app.post('/newpost', (req, res) => {
    let body = '';

    let is413 = false;
    req.on('data', function(data) {
        body += data;

        var maxData = 5 * 1000;
        if(data.length > maxData) {
            res.writeHead(413);
            let content =    ejs.render(err_ejs, { err: '送信データのサイズは5KB以内にしてください'});
            res.write(content);
            res.end();
            is413 = true;
        }
    });

    req.on('end', () => {
        if(is413)
            return;

        let post_data = qs.parse(body);

        const db = new sqlite3.Database(db_path);
        db.run(
            "insert into table_posts(name, body, createtime, updatetime) values(?,?,datetime('now', '+9 hours'),datetime('now', '+9 hours'))",
            post_data.name, post_data.body);
        db.close();

        res.writeHead(302, {'Location':'./'});
        res.end();
    });
});

app.get('/update:id', (req, res) => {
    let params = req.params;
    let query = `select * from table_posts where id = ${params.id}`;

    const db = new sqlite3.Database(db_path);
    db.get(query, (err, row) => {
        res.writeHead(200, {'Content-Type':'text/html'});
        if(row != null){
            let content = ejs.render(new_update_ejs, { new_update: '更新', action: `./update${params.id}`, oldname: row.name, oldbody: row.body});
            res.write(content);
        }
        else {
            let content =    ejs.render(err_ejs, { err: '404 ページが見つからない'});
            res.write(content);
        }
        res.end();
    });
    db.close();
});

app.post('/update:id', (req, res) => {
    let params = req.params;

    let body = '';
    let is413 = false;
    req.on('data', function(data) {
        body += data;

        var maxData = 5 * 1000;
        if(data.length > maxData) {
            res.writeHead(413);
            let content =    ejs.render(err_ejs, { err: '送信データのサイズは5KB以内にしてください'});
            res.write(content);
            res.end();
            is413 = true;
        }
    });

    req.on('end', () => {
        if(is413)
            return;

        let post_data = qs.parse(body);

        let query = `select * from table_posts where id = ${params.id}`;
        const db = new sqlite3.Database(db_path);

        // 更新しようとしているデータが存在するかチェックする
        db.get(query, (err, row) => {
            if(row != null){
                db.run("update table_posts set name = ? where id = ?", post_data.name, params.id);
                db.run("update table_posts set body = ? where id = ?", post_data.body, params.id);
                db.run("update table_posts set updatetime = datetime('now', '+9 hours') where id = ?", params.id);
            }

            res.writeHead(302, {'Location':'./'});
            res.end();
        });

        db.close();
    });
});

app.get('/delete:id', (req, res) => {
    let params = req.params;

    const db = new sqlite3.Database(db_path);
    db.serialize(() => {
        db.run("delete from table_posts where id = ?", params.id);

        res.writeHead(302, {'Location':'./'});
        res.end();
    });
    db.close();
});

app.use((req, res) => {
    let content =    ejs.render(err_ejs, { err: '404 ページが見つからない'});
    res.writeHead(200, {'Content-Type':'text/html'});
    res.write(content);
    res.end();
});