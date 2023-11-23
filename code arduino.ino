#include <ArduinoJson.h> // Thêm thư viện này
#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include "DHT.h"

const int DHTPIN = 5;
const int DHTTYPE = DHT11;
#define LDR 36
const char *ssid = "Abcdedg";
const char *password = "16012002"; //0338959598
const char *mqtt_server = "192.168.20.25";

WiFiClient espClient;
PubSubClient client(espClient);
long lastMsg = 0;
char msg[50];
int value = 0;
DHT dht(DHTPIN, DHTTYPE);
float humidity = 0.0;
float temperature = 0.0;
const int ledPin = 4;
const int ledPin2 = 18;

void setup() {
  Serial.begin(9600);
  dht.begin();
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  pinMode(ledPin, OUTPUT);
  pinMode(ledPin2, OUTPUT);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char *topic, byte *message, unsigned int length) {
  Serial.print("Message arrived on topic: ");
  Serial.print(topic);
  Serial.print(". Message: ");
  String messageTemp;
  for (int i = 0; i < length; i++) {
    Serial.print((char)message[i]);
    messageTemp += (char)message[i];
  }
  Serial.println();
  if (String(topic) == "control/led1") {
    Serial.print("Changing output to ");
    if (messageTemp == "on") {
      Serial.println("on");
      digitalWrite(ledPin, HIGH);
    } else if (messageTemp == "off") {
      Serial.println("off");
      digitalWrite(ledPin, LOW);
    }
  }
  if (String(topic) == "control/led2") {
    Serial.print("Changing output2 to ");
    if (messageTemp == "on") {
      Serial.println("on");
      digitalWrite(ledPin2, HIGH);
    } else if (messageTemp == "off") {
      Serial.println("off");
      digitalWrite(ledPin2, LOW);
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP8266Client")) {
      Serial.println("connected");
      client.subscribe("control/led1");
      client.subscribe("control/led2");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  long now = millis();
  if (now - lastMsg > 5000) {
    lastMsg = now;
    temperature = dht.readTemperature();
    humidity = dht.readHumidity();
    int LDR_val = 4095 - analogRead(LDR);

    DynamicJsonDocument jsonDoc(256); // Tạo một đối tượng JSON để lưu dữ liệu
    jsonDoc["temperature"] = temperature;
    jsonDoc["humidity"] = humidity;
    jsonDoc["light"] = LDR_val;
    char jsonString[256];
    serializeJson(jsonDoc, jsonString); // Chuyển đối tượng JSON thành chuỗi JSON
    client.publish("esp32/sensor_data", jsonString); // Gửi chuỗi JSON
  }
}
