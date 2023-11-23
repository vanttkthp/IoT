import paho.mqtt.client as mqtt
import time
import json

# Thiết lập thông tin kết nối MQTT
mqtt_broker_host = "192.168.21.101"
mqtt_broker_port = 1883
mqtt_topic = "dulieu"
mqtt_username = "P201"
mqtt_password = "0338959598"

client = mqtt.Client()
client.username_pw_set(mqtt_username, mqtt_password)
client.connect(mqtt_broker_host, mqtt_broker_port)

while True:
    data = {"temperature": 25, "humidity": 60}  # Dữ liệu gửi đi
    payload = json.dumps(data)
    client.publish(mqtt_topic, payload)
    print("Success")
    time.sleep(2)  # Gửi dữ liệu mỗi 2 giây