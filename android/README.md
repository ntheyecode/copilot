# WorkCoPilot — Android shell

A thin native WebView over the hosted WorkCoPilot console
(`https://admireveda.com/work`). The native layer adds only what the web
cannot do on its own:

- **Camera permission** for the live "watch my screen / show me" flow.
- **File / camera chooser** that powers the **Photo** capture
  (`<input type="file" accept="image/*" capture="environment">`).
- **Cookie persistence** so the login survives app restarts.
- **In-app back navigation** (hardware/gesture back walks WebView history).
- **Dark window background** so there is no white flash before the app paints.

This is the **reusable template** for the planned field-work products
(plumbers, solar, mechanics, …). To spin up a new one: change `START_URL`
and `ORIGIN` in `MainActivity.kt`, the `applicationId` + branding in
`app/build.gradle`, and the icon/colours in `res/`. Everything else carries
over unchanged.

## Build

Requires Android SDK (platform 35, build-tools 34+) and a JDK 17.

```bash
# Debug build (unsigned, for local testing)
./gradlew assembleDebug

# Release build (signed — see below)
./gradlew assembleRelease
```

The release APK lands at `app/build/outputs/apk/release/app-release.apk`.

## Release signing

Signing is driven entirely by environment variables, so **no keystore or
password is ever committed**. Generate a keystore once and keep it safe —
the *same* keystore must sign every future update or Android will refuse the
upgrade:

```bash
keytool -genkeypair -v \
  -keystore workcopilot-release.jks \
  -alias workcopilot \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then set the four variables before `assembleRelease`:

| Variable            | Meaning                              |
|---------------------|--------------------------------------|
| `WC_STORE_FILE`     | Absolute path to the `.jks` keystore |
| `WC_STORE_PASSWORD` | Keystore password                    |
| `WC_KEY_ALIAS`      | Key alias (e.g. `workcopilot`)       |
| `WC_KEY_PASSWORD`   | Key password                         |

When these are absent, `assembleRelease` produces an unsigned APK (handy for
CI smoke builds) and `assembleDebug` always works with the auto debug key.

## Distribution

The signed APK is uploaded to the WorkCoPilot server's download directory and
served via `/api/work/app/android`; the web app's download button links there
once `GET /api/work/app/status` reports `android.available: true`.
