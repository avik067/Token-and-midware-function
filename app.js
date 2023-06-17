const express = require("express"); //1
const path = require("path"); //2
const { open } = require("sqlite"); //3
const sqlite3 = require("sqlite3"); //4
const bcrypt = require("bcrypt"); // 5
const jwt = require("jsonwebtoken"); // 6

const app = express(); // we are saving a instance of express inside this app //
app.use(express.json()); // midware function //

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// POST 1

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  initialQuery = `SELECT * FROM user WHERE username = '${username}' ; `;

  const dbUser = await db.get(initialQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isMatched = await bcrypt.compare(password, dbUser.password);
    if (isMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "SECRET");
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const verifyToken = (request, response, next) => {
  console.log("hi");
  const tokenH = request.headers["authorization"];
  let jwtT;
  if (tokenH !== undefined) {
    jwtT = tokenH.split(" ")[1];
  }
  if (jwtT === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtT, "SECRET", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        console.log("verification successful");
        request.username = payload.username;
        next();
      }
    });
  }
};

// GET
app.get("/states/", verifyToken, async (request, response) => {
  const { username } = request;
  const finalQuery = `
                            SELECT state_id AS stateId ,
                                    state_name AS stateName ,
                                    population AS population 
                            FROM state 
                           
    `;
  const finalResultA = await db.all(finalQuery);
  response.status(200);
  response.send(finalResultA);
});

// GET
app.get("/states/:stateId/", verifyToken, async (request, response) => {
  const { stateId } = request.params;
  const { username } = request;
  const finalQuery = `
                            SELECT state_id AS stateId ,
                                    state_name AS stateName ,
                                    population AS population 
                            FROM state 
                            WHERE state_id = '${stateId}' ;
                           
    `;
  const finalResultA = await db.get(finalQuery);
  response.status(200);
  response.send(finalResultA);
});

//POST

app.post("/districts/", verifyToken, async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const addDistrict = `
    INSERT INTO
        district (district_name,state_id ,cases,cured,active,deaths)
    VALUES (
       '${districtName}',
       '${stateId}',
       '${cases}',
       '${cured}',
       '${active}',
       '${deaths}'
    );
   `;
  const responseDb = await db.run(addDistrict);
  response.send("District Successfully Added");
});

//GET
app.get("/districts/:districtId/", verifyToken, async (request, response) => {
  const { districtId } = request.params;

  const query = `
   SELECT     district_id AS districtId ,
               district_name AS districtName ,
              state_id  AS  stateId ,
              cases  AS   cases ,
              cured  AS  cured ,
               active  AS active ,
              deaths   AS deaths
   FROM district 
   WHERE district_id = ${districtId} ;
   `;
  const result = await db.get(query);
  response.send(result);
});

// DE l
app.delete(
  "/districts/:districtId/",
  verifyToken,
  async (request, response) => {
    const { districtId } = request.params;

    const deleteDistrict = `
    DELETE FROM
        district
    WHERE
      district_id = '${districtId}'
    ;
   `;
    const responseDb = await db.run(deleteDistrict);
    response.send("District Removed");
  }
);

// PUT

app.put("/districts/:districtId/", verifyToken, async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const changeDistrict = `
    UPDATE
        district
    SET
      district_name    =  '${districtName}',
      state_id = '${stateId}',
      cases = '${cases}',
      cured = '${cured}',
      active = '${active}',
      deaths = '${deaths}'
    WHERE
      district_id = '${districtId}'
    ;
   `;
  const responseDb = await db.run(changeDistrict);

  response.send("District Details Updated");
});

// GET
app.get("/states/:stateId/stats/", verifyToken, async (request, response) => {
  const { stateId } = request.params;

  const query = `
   SELECT SUM(cases) AS totalCases ,
     SUM (cured) AS totalCured ,
     SUM (active) AS totalActive ,
     SUM (deaths) AS totalDeaths
   FROM state LEFT JOIN district  ON state.state_id = district.state_id
   WHERE state.state_id = ${stateId}
   GROUP BY state.state_id
   ;
   `;
  const result = await db.get(query);

  response.send(result);
});

module.exports = initializeDBAndServer;
module.exports = app;
