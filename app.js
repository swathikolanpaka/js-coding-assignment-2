const express = require("express");
const path = require("path");
const app = express();
app.use(express.json());
const { open } = require("sqlite");
const sqlite = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
let db = null;

const dbPath = path.join(__dirname, "twitterClone.db");

// Initialize Db and Server
const initializeDbAndServer = async () => {
  try {
    db = await open({
      driver: sqlite.Database,
      filename: dbPath,
    });
    app.listen(3000, () => {
      console.log("Server is running");
    });
  } catch (e) {
    console.log(`Db error:${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//API 1 Register

app.post("/register/", async (request, response) => {
  const userDetails = request.body;
  const { username, password, name, gender } = userDetails;
  let hashedPassword = await bcrypt.hash(password, 10);
  const userQuery = `SELECT* FROM user WHERE username="${username}";`;
  const dbUser = await db.get(userQuery);

  if (dbUser === undefined) {
    const createUser = `INSERT INTO user (username,password,name,gender) 
        VALUES 
        ("${username}",
        "${hashedPassword}",
        "${name}",
        "${gender}"
            );`;
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      await db.run(createUser);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//API 2 Login
app.post("/login/", async (request, response) => {
  const userDetails = request.body;
  const { username, password } = userDetails;
  const loginQuery = `SELECT * FROM user WHERE username="${username}";`;
  const dbUser = await db.get(loginQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "my_code");
      response.send({ jwtToken });
      console.log({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//authorizationToken function

const authorizationToken = (request, response, next) => {
  let jwtToken;
  const authorHeader = request.headers["authorization"];
  console.log("author block");
  //console.log(authorHeader);
  if (authorHeader !== undefined) {
    jwtToken = authorHeader.split(" ")[1];
    console.log(jwtToken);
  }
  if (authorHeader === undefined) {
    console.log("no token");
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    console.log("verifying");

    jwt.verify(jwtToken, "my_code", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        console.log(request.username);
        next();
      }
    });
  }
};

//API 3
app.get("/user/tweets/feed/", authorizationToken, async (request, response) => {
  console.log("working");
});

module.exports = app;
