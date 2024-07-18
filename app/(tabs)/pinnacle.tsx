import React, { useState, useEffect } from "react";
import { StyleSheet, View, Platform, ScrollView } from "react-native";
import { Button, ListItem } from "@rneui/themed";
import { Barometer } from "expo-sensors";
import * as Location from "expo-location";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

function avarage(data: number[]) {
  console.log(data);
  const x = data.reduce((prev, cur) => prev + cur);
  return x / data.length;
}

function variance(data: number[]) {
  const avg = avarage(data);
  const squaredDifference = data.map((cur) => {
    const difference = cur - avg;
    return difference ** 2;
  });
  return squaredDifference.reduce((prev, cur) => prev + cur) / data.length;
}

const SAMPLES_NUM = 25;
export default function Home() {
  const [pressure, setPressure] = useState(0);
  const [pressures, setPressures] = useState(new Array(SAMPLES_NUM));
  const [pressuresIndex, setPressuresIndex] = useState(0);
  const [result, setResult] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | undefined>(
    undefined
  );
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    (async () => {
      let uuid = await SecureStore.getItemAsync("secure_deviceid");
      if (uuid?.length != 36) {
        uuid = uuidv4();
        await SecureStore.setItemAsync("secure_deviceid", uuid);
      }
      setDeviceId(uuid);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  useEffect(() => {
    Barometer.addListener((x) => {
      setPressure(x.pressure);
    });
  }, []);

  useEffect(() => {
    if (!pressure) return;
    pressures[pressuresIndex % SAMPLES_NUM] = pressure * 100;
    setPressures(pressures);
    setPressuresIndex(pressuresIndex + 1);
  }, [pressure]);

  async function postData() {
    const p = pressures.filter((x) => x !== undefined);
    console.log(p);
    const data = {
      appId: process.env.EXPO_PUBLIC_APP_ID,
      deviceId: process.env.EXPO_PUBLIC_DEVICE_ID,
      phoneModel: Device.modelName,
      xyLocation: {
        latitude: location?.coords?.latitude,
        longitude: location?.coords?.longitude,
        accuracy: location?.coords?.accuracy,
      },
      timestamp: location?.timestamp,
      pressure: {
        average: avarage(p),
        variance: variance(p),
        count: p.length,
        min: Math.min(...p),
        max: Math.max(...p),
      },
    };
    console.log(data);
    const res = await fetch("https://api.nextnav.io/plh/v1/get-live-height", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.EXPO_PUBLIC_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.status == 200) {
      console.log(json.result);
      setResult(json.result);
    } else {
      console.log(res);
    }
  }

  async function onPress() {
    setIsLoading(true);
    await postData();
    setIsLoading(false);
  }

  return (
    <ScrollView style={styles.container}>
      {isLoading && (
        <View style={styles.loading}>
          <Button title="Solid" type="solid" loading />
        </View>
      )}
      <ListItem>
        <ListItem.Content>
          <ListItem.Title>気圧 / Barometer</ListItem.Title>
          <ListItem.Subtitle>{pressure} [hPa]</ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem>
        <ListItem.Content>
          <ListItem.Title>緯度 / Latitude</ListItem.Title>
          <ListItem.Subtitle>
            {location?.coords?.latitude} [°]
          </ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem>
        <ListItem.Content>
          <ListItem.Title>経度 / Longitude</ListItem.Title>
          <ListItem.Subtitle>
            {location?.coords?.longitude} [°]
          </ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem>
        <ListItem.Content>
          <ListItem.Title>位置精度 / Accuracy</ListItem.Title>
          <ListItem.Subtitle>
            {location?.coords?.accuracy} [m]
          </ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem>
        <ListItem.Content>
          <ListItem.Title>高度 / Altitude</ListItem.Title>
          <ListItem.Subtitle>
            {location?.coords?.altitude} [m]
          </ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem>
        <ListItem.Content>
          <ListItem.Title>高度精度 / Altitude Accuracy</ListItem.Title>
          <ListItem.Subtitle>
            {location?.coords?.altitudeAccuracy} [m]
          </ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <Button title="計測" onPress={onPress} />
      <ListItem bottomDivider>
        <ListItem.Content>
          <ListItem.Title>楕円体高 / HAE</ListItem.Title>
          <ListItem.Subtitle>{result.hae?.value} [m]</ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem bottomDivider>
        <ListItem.Content>
          <ListItem.Title>楕円体高精度 68%</ListItem.Title>
          <ListItem.Subtitle>{result.hae?.accuracy68} [m]</ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem bottomDivider>
        <ListItem.Content>
          <ListItem.Title>楕円体高精度 90%</ListItem.Title>
          <ListItem.Subtitle>{result.hae?.accuracy90} [m]</ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem bottomDivider>
        <ListItem.Content>
          <ListItem.Title>楕円体高精度 95%</ListItem.Title>
          <ListItem.Subtitle>{result.hae?.accuracy95} [m]</ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem bottomDivider>
        <ListItem.Content>
          <ListItem.Title>地上高 / HAT</ListItem.Title>
          <ListItem.Subtitle>{result.hat?.value} [m]</ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem bottomDivider>
        <ListItem.Content>
          <ListItem.Title>地上高精度 68%</ListItem.Title>
          <ListItem.Subtitle>{result.hat?.accuracy68} [m]</ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem bottomDivider>
        <ListItem.Content>
          <ListItem.Title>地上高精度 90%</ListItem.Title>
          <ListItem.Subtitle>{result.hat?.accuracy90} [m]</ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem bottomDivider>
        <ListItem.Content>
          <ListItem.Title>地上高精度 95%</ListItem.Title>
          <ListItem.Subtitle>{result.hat?.accuracy95} [m]</ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
      <ListItem bottomDivider>
        <ListItem.Content>
          <ListItem.Title>キャリブレーション / barocalNeeded</ListItem.Title>
          <ListItem.Subtitle>{result.barocalNeeded}</ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
  },
  loading: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
