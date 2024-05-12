const express = require("express");
const mqtt = require("mqtt");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();


const port = 3001;

const mqttClient = mqtt.connect("mqtt://192.168.32.25");

const db = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "V@nDC1684",
  database: "iot_data",
});

db.connect((err) => {
  if (err) {
    console.error("Lỗi kết nối MySQL: " + err.stack);
    return;
  }
  console.log("Kết nối MySQL thành công");
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// When MQTT connection is established
mqttClient.on("connect", () => {
  console.log("Kết nối MQTT thành công");
  mqttClient.subscribe("esp32/sensor_data");
});

// When MQTT message is received
mqttClient.on("message", (topic, message) => {
  const data = message.toString();
  // Log received data

 
  try {
    const sensorData = JSON.parse(data);
    

    const sql =
      "INSERT INTO sensor_data (temperature, humidity, light) VALUES (?, ?, ?)";
    db.query(
      sql,
      [sensorData.temperature, sensorData.humidity, sensorData.light],
      (err, results) => {
        if (err) {
          console.error("Lỗi khi lưu dữ liệu vào MySQL: " + err.message);
        } else {
          console.log("Dữ liệu đã được lưu vào MySQL");
        }
      }
    );
  } catch (err) {
    console.error("Lỗi khi parse dữ liệu JSON: " + err.message);
  }
});

app.post("/api/controlLed", (req, res) => {
  const { ledId, action } = req.body;

  if (ledId === "led1") {
    mqttClient.publish("control/led1", action);
  } else if (ledId === "led2") {
    mqttClient.publish("control/led2", action);
  } else {
    res.status(400).json({ success: false, message: "Invalid LED ID" });
    return;
  }
  
  

  const query = "INSERT INTO action (led_name, action) VALUES (?, ?)";
  db.query(query, [ledId, action], (error, results) => {
    if (error) {
      console.error("Error:", error);
      res.status(500).json({ success: false });
    } else {
      res.json({ success: true });
    }
  });
});
app.get("/api/countActions", (req, res) => {
  const countOnQuery = "SELECT COUNT(*) AS count_on FROM action WHERE action = 'on'";
  const countOffQuery = "SELECT COUNT(*) AS count_off FROM action WHERE action = 'off'";

  db.query(countOnQuery, (errOn, resultOn) => {
    if (errOn) {
      console.error("Error counting 'on' actions:", errOn);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    } else {
      db.query(countOffQuery, (errOff, resultOff) => {
        if (errOff) {
          console.error("Error counting 'off' actions:", errOff);
          res.status(500).json({ success: false, message: "Internal Server Error" });
        } else {
          const countOn = resultOn[0].count_on || 0;
          const countOff = resultOff[0].count_off || 0;
          res.json({ count_on: countOn, count_off: countOff });
        }
      });
    }
  });
});


app.get("/actions", (req, res) => {
  const selectActionsQuery = "SELECT * FROM action ORDER BY timestamp DESC";
  db.query(selectActionsQuery, (err, results) => {
    if (err) {
      console.error("Error fetching actions:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(results);
    }
  });
});
app.get("/lastestAction", (req, res) => {
  const selectActionsQuery = "SELECT * FROM action WHERE led_name = 'led1' ORDER BY timestamp DESC LIMIT 1";
  db.query(selectActionsQuery, (err, results) => {
    if (err) {
      console.error("Error fetching actions:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(results);
    }
  });
});
app.get("/lastestAction1", (req, res) => {
  const selectActionsQuery = "SELECT * FROM action WHERE led_name = 'led2' ORDER BY timestamp DESC LIMIT 1";
  db.query(selectActionsQuery, (err, results) => {
    if (err) {
      console.error("Error fetching actions:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(results);
    }
  });
});
app.get("/countSwitchOn", (req, res) => {
  const countSwitchOnQuery = "SELECT led_name, COUNT(*) AS count_switch_on FROM action WHERE led_name IN ('led1', 'led2') GROUP BY led_name";
  db.query(countSwitchOnQuery, (err, results) => {
    if (err) {
      console.error("Error counting switch on actions:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(results);
    }
  });
});

 app.get("/api/sensorData", (req, res) => {
   const selectSensorDataQuery =
     "SELECT * FROM sensor_data ORDER BY timestamp DESC";
   db.query(selectSensorDataQuery, (err, results) => {
     if (err) {
       console.error("Error", err);
      res.status(500).send("Internal Server Error");
     } else {
       res.json(results);
    }
   });
 });

 app.get("/api/sensorData/search", (req, res) => {
  const { startTime, endTime } = req.query;

  // Validate the provided time range
  if (!startTime || !endTime) {
    res.status(400).send("Bad Request: Missing startTime or endTime");
    return;
  }

  // Construct the SQL query
  const query = "SELECT * FROM sensor_data WHERE timestamp BETWEEN ? AND ?";

  // Execute the query using the provided time range
  db.query(query, [startTime, endTime], (err, results) => {
    if (err) {
      console.error("Error fetching sensor data:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(results);
    }
  });
});
app.get("/api/latestSensorData", (req, res) => {
  const selectLatestSensorDataQuery =
    "SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1";

  db.query(selectLatestSensorDataQuery, (err, results) => {
    if (err) {
      console.error("Error", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(results[0]); // Trả về bản ghi mới nhất
    }
  });
});

app.get("/api/recentSensorData", (req, res) => {
  const selectRecentSensorDataQuery =
    "SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 10";

  db.query(selectRecentSensorDataQuery, (err, results) => {
    if (err) {
      console.error("Error", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(results);
    }
  });
});
app.get('/sensor-data', (req, res) => {
  const { date } = req.query; // Ngày cần tìm kiếm
  const startDate = `${date} 00:00:00`; // Bắt đầu từ 00:00:00
  const endDate = `${date} 23:59:59`; // Kết thúc vào 23:59:59

  const query = `
    SELECT * FROM sensor_data 
    WHERE timestamp BETWEEN ? AND ?
  `;

  db.query(query, [startDate, endDate], (err, results) => {
    if (err) {
      console.error('Lỗi truy vấn:', err);
      res.status(500).json({ error: 'Lỗi truy vấn cơ sở dữ liệu' });
      return;
    }
    res.json(results);
  });
});

app.get("/api/recentActionData", (req, res) => {
  const selectRecentSensorDataQuery =
    "SELECT * FROM action ORDER BY timestamp DESC LIMIT 10";

  db.query(selectRecentSensorDataQuery, (err, results) => {
    if (err) {
      console.error("Error", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(results);
    }
  });
});

app.put("/api/sensorData/:id/update", (req, res) => {
  const { id } = req.params;
  const { timestamp, temperature, humidity, light } = req.body;
  const updateSensorDataQuery = "UPDATE sensor_data SET temperature = ?, humidity = ?, light = ?, timestamp = ? WHERE id = ?";
  
  db.query(updateSensorDataQuery, [temperature, humidity, light, timestamp, id], (err, result) => {
    if (err) {
      console.error("Error", err);
      res.status(500).send("Internal Server Error");
    } else {
      if (result.affectedRows === 0) {
        res.status(404).send("Record not found");
      } else {
        res.send("Record updated successfully");
      }
    }
  });
});

app.post("/api/sensorData", (req, res) => {
  const { temperature, humidity, light } = req.body;

  // Kiểm tra xem dữ liệu cần thiết đã được cung cấp hay chưa
  if (!temperature || !humidity || !light) {
    res.status(400).send("Bad Request: Missing createtemp, hum, or light");
    return;
  }

  // Thực hiện truy vấn để chèn dữ liệu mới vào cơ sở dữ liệu
  const insertSensorDataQuery = "INSERT INTO sensor_data (temperature, humidity, light) VALUES (?, ?, ?)";
  db.query(insertSensorDataQuery, [temperature, humidity, light], (err, results) => {
    if (err) {
      console.error("Error", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.status(201).send("Data created successfully");
    }
  });
});

app.delete("/api/sensorData/:id", (req, res) => {
  const { id } = req.params;
  const deleteSensorDataQuery = "DELETE FROM sensor_data WHERE id = ?";
  
  db.query(deleteSensorDataQuery, [id], (err, result) => {
    if (err) {
      console.error("Error", err);
      res.status(500).send("Internal Server Error");
    } else {
      if (result.affectedRows === 0) {
        res.status(404).send("Record not found");
      } else {
        res.send("Record deleted successfully");
      }
    }
  });
});
app.get("/api/actionsPage/:pageNumber/:pageSize", (req, res) => {
  const { pageNumber, pageSize } = req.params;
  const offset = (pageNumber - 1) * pageSize;

  const selectActionsQuery = "SELECT * FROM action ORDER BY timestamp DESC LIMIT ? OFFSET ?";
  db.query(selectActionsQuery, [parseInt(pageSize), offset], (err, results) => {
    if (err) {
      console.error("Error fetching actions:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(results);
    }
  });
});
app.get("/api/sensorDataPage/:pageNumber/:pageSize", (req, res) => {
  const { pageNumber, pageSize } = req.params;
  const offset = (pageNumber - 1) * pageSize;

  const selectSensorDataQuery = "SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT ? OFFSET ?";
  db.query(selectSensorDataQuery, [parseInt(pageSize), offset], (err, results) => {
    if (err) {
      console.error("Error fetching sensor data:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.json(results);
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
