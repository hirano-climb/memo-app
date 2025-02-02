const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();
require('dotenv').config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");


const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("MySQL Connection Error: ", err);
  } else {
    console.log("Connected to MySQL successfully!");
    connection.release();
  }
});

app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

//セッション
app.use((req, res, next)=>{
  if (req.session.userId === undefined) {
    res.locals.username='ゲスト';
    res.locals.isLoggedIn=false;
  } else {
    res.locals.username=req.session.username;
    res.locals.isLoggedIn=true;
  }
  next();
});

//トップ
app.get("/", (req, res) => {
  res.render("top");
});

//メモ一覧
app.get("/index", (req, res) => {  
  const message = req.session.message;
  delete req.session.message; 
  const keyword = req.query.keyword || ''; 
  const query = `
  SELECT memos.*, users.username 
  FROM memos 
  LEFT JOIN users ON memos.user_id = users.id 
  WHERE memos.title LIKE ? OR memos.content LIKE ? OR memos.type LIKE ? OR users.username LIKE ?
  `;
  const searchKeyword = `%${keyword}%`;
  db.query(query, [searchKeyword, searchKeyword, searchKeyword, searchKeyword], (err, results) => {
    res.render("index", { 
      memos: results || [],
      loggedInUserId: req.session.userId, 
      userCategory: req.session.category, 
      message,
      keyword
    });
  });
});

app.get('/article/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM memos WHERE id = ?', [id], (err, results) => {
    res.render('article', { article: results[0] });
  });
});


//ログイン
app.get('/login', (req, res) => {
  const loginMessage = req.session.loginMessage;
  delete req.session.loginMessage; 
  res.render('login', {message: loginMessage});
});

app.post('/login', (req, res) => {
  const email = req.body.email;
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (!results || results.length === 0) {
      req.session.loginMessage = { type: 'error', text: 'メールアドレスまたはパスワードが間違っています' };
      return res.redirect('/login');
    } 
    
    const plain = req.body.password;
    const hash = results[0].password;
    bcrypt.compare(plain, hash , (err,isEqual )=>{
      if(isEqual){
        req.session.userId = results[0].id;
        req.session.username = results[0].username;
        req.session.category = results[0].category;
        req.session.message = { type: 'success', text: 'ログイン成功しました！' }; 
        res.redirect('/index');
      } else{
        req.session.loginMessage = { type: 'error', text: 'メールアドレスまたはパスワードが間違っています' };
        res.redirect('/login');
      }
    });
  });
});

//ログアウト
app.get('/logout', (req, res) => {
  req.session.destroy((err)=>{
    res.redirect('/');
  });
});


// メモ作成
app.get("/new", (req, res) => {
  res.render("new", { errors: [] });
});

app.post("/create", (req, res, next) => {
  const { title, content, type } = req.body;
  const errors = [];

  if (title === '') {
    errors.push('タイトルが空です');
  }
  if (content === '') {
    errors.push('内容が空です');
  }
  if (type === '') {
    errors.push('区分を選択してください');
  }
  if (errors.length > 0) {
    res.render('new', { errors: errors });
  } else {
    next();
  }
},
(req, res) => {
  const { title, content, type } = req.body;
  const userId = req.session.userId; 
  db.query("INSERT INTO memos (title, content ,type, user_id) VALUES (?, ?, ?, ?)", [title, content, type, userId], (err, results) => {
    req.session.message = { type: 'success', text: 'メモ登録 成功しました！' }; 
    res.redirect("/index");
  });
});

// メモ削除
app.post("/delete/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM memos WHERE id = ?", [id], (err, results) => {
    res.redirect("/index");
  });
});

// メモ更新
app.get('/edit/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM memos WHERE id = ?', [id], (err, results) => {
    res.render('edit', {memo: results[0], errors: [] });
  });
});

app.post('/update/:id', (req, res, next) => {
  const { title, content, type } = req.body;
  const id = req.params.id;
  const errors = [];

  if (title === '') {
    errors.push('タイトルが空です');
  }
  if (content === '') {
    errors.push('内容が空です');
  }
  if (type === '') {
    errors.push('区分を選択してください');
  }
  if (errors.length > 0) {
    db.query('SELECT * FROM memos WHERE id = ?', [id], (err, results) => {
      res.render('edit', { memo: results[0], errors: errors });
    });
  } else {
    next();
  }
},
(req, res) => {
  const { title, content, type } = req.body;
  const id = req.params.id;
  db.query('UPDATE memos SET title = ?, content= ?, type= ?  WHERE id = ?', [title, content, type, id], (err, results) => {
    req.session.message = { type: 'success', text: 'メモ更新 成功しました！' }; 
    res.redirect('/index');
  });
});


//ユーザー登録
app.get('/signup', (req, res) => {
  res.render('signup.ejs', { errors: [] });
});

app.post('/signup', (req, res, next) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const errors = [];

  if (username === '') {
    errors.push('ユーザー名が空です');
  }
  if (email === '') {
    errors.push('メールアドレスが空です');
  }else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.push('有効なメールアドレスを入力してください');
  }
  if (password === '') {
    errors.push('パスワードが空です');
  }else if (password.length < 8) {
    errors.push('パスワードは8文字以上にしてください');
  }
  else if (!/(?=.*\d)/.test(password)) {
    errors.push('パスワードには数字を含める必要があります');
  }
  if (errors.length > 0) {
    return res.render('signup.ejs', { errors: errors });
  }
  next();
},
(req, res, next) => {
  const email = req.body.email;
  const username = req.body.username;
  const errors=[];
  
   db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], (err, results) => {
    
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('データベースエラーが発生しました');
    }
    console.log('User search results:', results);
    
    if (results.length > 0) {
      results.forEach(user => {
        if (user.username === username) {
          errors.push('このユーザー名は既に使用されています');
        }
        if (user.email === email) {
          errors.push('このメールアドレスは既に使用されています');
        }
      });
      return res.render('signup.ejs', { errors: errors });
    }
    next();
  });
},
(req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('Bcrypt error:', err);
        return res.status(500).send('パスワードの暗号化中にエラーが発生しました');
      }
      db.query('INSERT INTO users (username, email, password, category) VALUES (?, ?, ?, ?)',[username, email, hash, 'limited'], (err, results) => {
      if (err) {
        console.error('Database insert error:', err);
        return res.status(500).send('データベースエラー');
      }
      req.session.userId = results.insertId;
      req.session.username = username;
      req.session.message = { type: 'success', text: 'ユーザー登録 成功しました！' }; 
      return res.redirect('/user_index');
    });
  });
});

//ユーザ一覧
app.get("/user_index", (req, res) => {
  const message = req.session.message;
  delete req.session.message; 
  db.query("SELECT * FROM users", (err, results) => {
    res.render("user_index", { users: results|| [] ,loggedInUserId: req.session.userId, userCategory: req.session.category, message});
  });
});

// ユーザ削除
app.post("/user_delete/:id", (req, res) => {
  const id = req.params.id;
  db.query("UPDATE memos SET user_id = NULL WHERE user_id = ?", [id], (err, results) => {
    db.query("DELETE FROM users WHERE id = ?", [id], (err, results) => {
      if (req.session.userId == id) {
        req.session.destroy((err) => {
          res.redirect("/user_index");
        });
      } else {
        res.redirect("/user_index");
      }
    });
  });
});


// ユーザ更新
app.get('/user_edit/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    res.render('user_edit', {user: results[0], errors: []});
  });
});

app.post('/user_update/:id', (req, res, next) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const id = req.params.id;
  const errors = [];

  if (username === '') {
    errors.push('ユーザー名が空です');
  }
  if (email === '') {
    errors.push('メールアドレスが空です');
  }else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.push('有効なメールアドレスを入力してください');
  }
  if (password === '') {
    errors.push('パスワードが空です');
  }else if (password.length < 8) {
    errors.push('パスワードは8文字以上にしてください');
  }
  else if (!/(?=.*\d)/.test(password)) {
    errors.push('パスワードには数字を含める必要があります');
  }
  if (errors.length > 0) {
    db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
      res.render('user_edit', { user: results[0], errors: errors });
    });
  }
  
  db.query('SELECT email, username FROM users WHERE id = ?', [id], (err, results) => {

    const currentUsername = results[0].username;
    const currentEmail = results[0].email;
    const queries = [];
    if (username !== currentUsername) {
      queries.push(
        new Promise((resolve, reject) => {
          db.query('SELECT * FROM users WHERE username = ?', [username], (err, duplicateResults) => {
            if (duplicateResults.length > 0) {
              errors.push('そのユーザー名はすでに使用されています');
            }
            resolve();
          });
        })
      );
    }

    if (email !== currentEmail) {
      queries.push(
        new Promise((resolve, reject) => {
          db.query('SELECT * FROM users WHERE email = ?', [email], (err, duplicateResults) => {
            if (duplicateResults.length > 0) {
              errors.push('そのメールアドレスはすでに使用されています');
            }
            resolve();
          });
        })
      );
    }

    Promise.all(queries)
      .then(() => {
        if (errors.length > 0) {
          return db.query('SELECT * FROM users WHERE id = ?', [id], (err, userResults) => {
            res.render('user_edit', { user: userResults[0], errors: errors });
          });
        }
        next();
      })
      .catch(next);
  });
},
(req, res) => {
  const username = req.body.username;
  const email = req.body.email; 
  const password = req.body.password;
  const id = req.params.id;

  bcrypt.hash(password, 10, (err, hash) => {
    db.query('UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?', [username, email, hash, id], (err, results) => {
      if (req.session.userId === Number(id)) {
        req.session.username = username;
      }
      req.session.message = { type: 'success', text: 'ユーザー更新 成功しました！' }; 
      res.redirect('/user_index');
    });
  });
});


// サーバー起動
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`サーバーが http://localhost:${PORT} で起動しました`);
});
