import 'dart:io';

import 'package:flutter/material.dart';
import 'splash_screen.dart';
import 'social_login.dart';
import 'main_screen.dart';
import 'tutorial_screen.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'api_service.dart';
import 'firebase_options.dart';
import 'package:kakao_flutter_sdk_user/kakao_flutter_sdk_user.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  KakaoSdk.init(nativeAppKey: 'b411ab336a0428cb29968ac6a558f58e');

  runApp(const MyApp());

  // 알림 권한 팝업 (로그인 전에 띄움)
  _requestNotificationPermission();
}

Future<void> _requestNotificationPermission() async {
  try {
    await FirebaseMessaging.instance.requestPermission();
  } catch (e) {
    print('알림 권한 요청 실패: $e');
  }
}

/// FCM 토큰을 서버에 등록 (로그인 후 호출)
Future<void> registerFcmTokenToServer() async {
  try {
    if (Platform.isIOS) {
      final apnsToken = await FirebaseMessaging.instance.getAPNSToken();
      if (apnsToken == null) {
        print('APNS token 아직 준비 안 됨');
        return;
      }
    }

    final token = await FirebaseMessaging.instance.getToken();
    print('FCM token: $token');

    if (token != null) {
      await ApiService.registerFcmToken(token);
    }
  } catch (e) {
    print('FCM 등록 실패: $e');
  }
}

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  void initState() {
    super.initState();
    _setupForegroundNotification();
  }

  void _setupForegroundNotification() {
    // 앱 포그라운드에서 알림 수신 → 인앱 배너
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notification = message.notification;
      if (notification == null) return;

      final ctx = navigatorKey.currentContext;
      if (ctx == null) return;

      ScaffoldMessenger.of(ctx).showSnackBar(
        SnackBar(
          content: GestureDetector(
            onTap: () {
              ScaffoldMessenger.of(ctx).hideCurrentSnackBar();
              _navigateByFcmData(message.data);
            },
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (notification.title != null)
                  Text(
                    notification.title!,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                if (notification.body != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      notification.body!,
                      style: const TextStyle(fontSize: 13),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
            ),
          ),
          behavior: SnackBarBehavior.floating,
          backgroundColor: const Color(0xFF391713),
          duration: const Duration(seconds: 4),
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          action: SnackBarAction(
            label: '보기',
            textColor: const Color(0xFFE37474),
            onPressed: () => _navigateByFcmData(message.data),
          ),
        ),
      );
    });

    // 백그라운드에서 알림 탭 → 해당 화면 이동
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _navigateByFcmData(message.data);
    });

    // 앱 종료 상태에서 알림 탭으로 시작된 경우
    FirebaseMessaging.instance.getInitialMessage().then((message) {
      if (message != null) _navigateByFcmData(message.data);
    });
  }

  void _navigateByFcmData(Map<String, dynamic> data) {
    final screen = data['screen']?.toString() ?? '';
    final nav = navigatorKey.currentState;
    if (nav == null) return;

    switch (screen) {
      case 'chat':
        final chatRoomId = int.tryParse(data['chatRoomId']?.toString() ?? '');
        if (chatRoomId != null) {
          nav.pushNamedAndRemoveUntil('/home', (route) => false, arguments: {'index': 1, 'friendsTab': 1});
        } else {
          nav.pushNamedAndRemoveUntil('/home', (route) => false, arguments: {'index': 1, 'friendsTab': 1});
        }
        break;
      case 'exchange':
        nav.pushNamedAndRemoveUntil('/home', (route) => false, arguments: {'index': 1, 'friendsTab': 0});
        break;
      case 'requests':
        nav.pushNamedAndRemoveUntil('/home', (route) => false, arguments: {'index': 1, 'friendsTab': 2});
        break;
      case 'ai_report':
        nav.pushNamedAndRemoveUntil('/home', (route) => false, arguments: {'index': 0});
        break;
      case 'settings':
        nav.pushNamedAndRemoveUntil('/home', (route) => false, arguments: {'index': 2});
        break;
      default:
        nav.pushNamedAndRemoveUntil('/home', (route) => false, arguments: {'index': 0});
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      title: 'Ember',
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('ko', 'KR'), Locale('en', 'US')],
      theme: EmberTheme.light,
      home: const SplashScreen(),
      routes: {
        '/socialLogin': (context) => const SocialLogin(),
        '/tutorial': (context) => const TutorialScreen(),
        '/home': (context) {
          final args = ModalRoute.of(context)?.settings.arguments;
          if (args is Map) {
            return MainScreen(
              initialIndex: args['index'] is int ? args['index'] as int : 0,
              initialFriendsTab: args['friendsTab'] is int
                  ? args['friendsTab'] as int
                  : 0,
            );
          }
          return MainScreen(initialIndex: args is int ? args : 0);
        },
      },
    );
  }
}
