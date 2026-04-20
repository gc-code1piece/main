import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:kakao_flutter_sdk_user/kakao_flutter_sdk_user.dart';

void main() {
  KakaoSdk.init(nativeAppKey: '033bc5c71a42c748495bf1ec7b0ef77e');
  runApp(const EmberTestApp());
}

class EmberTestApp extends StatelessWidget {
  const EmberTestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ember API Test',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF6B35),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const ApiTestPage(),
    );
  }
}

class ApiTestPage extends StatefulWidget {
  const ApiTestPage({super.key});

  @override
  State<ApiTestPage> createState() => _ApiTestPageState();
}

class _ApiTestPageState extends State<ApiTestPage> {
  // 배포 서버: https://ember-app.duckdns.org
  // 에뮬레이터 로컬: http://10.0.2.2:8080
  final String baseUrl = 'https://ember-app.duckdns.org';

  final Dio dio = Dio();
  String? accessToken;
  String? refreshToken;
  String? kakaoAccessToken;
  String? generatedNickname;
  final List<String> logs = [];

  void log(String message) {
    setState(() {
      logs.insert(0, '[${DateTime.now().toString().substring(11, 19)}] $message');
      if (logs.length > 50) logs.removeLast();
    });
  }

  /// 에러 메시지 추출 (서버 에러코드 포함)
  String errMsg(dynamic e) {
    if (e is DioException && e.response?.data != null) {
      final data = e.response!.data;
      if (data is Map) {
        return '[${data['code']}] ${data['message']}';
      }
    }
    return '$e';
  }

  // 1. 카카오 SDK 로그인 → Access Token 획득
  Future<void> kakaoLogin() async {
    try {
      OAuthToken token;
      if (await isKakaoTalkInstalled()) {
        token = await UserApi.instance.loginWithKakaoTalk();
        log('카카오톡으로 로그인 성공');
      } else {
        token = await UserApi.instance.loginWithKakaoAccount();
        log('카카오 계정으로 로그인 성공');
      }
      kakaoAccessToken = token.accessToken;
      log('카카오 AT: ${kakaoAccessToken!.substring(0, 20)}...');
    } catch (e) {
      log('카카오 로그인 실패: ${errMsg(e)}');
    }
  }

  // 2. 서버 소셜 로그인
  Future<void> socialLogin() async {
    if (kakaoAccessToken == null) {
      log('먼저 카카오 로그인을 하세요');
      return;
    }
    try {
      final res = await dio.post('$baseUrl/api/auth/social', data: {
        'provider': 'KAKAO',
        'socialToken': kakaoAccessToken,
      });
      final data = res.data['data'];
      accessToken = data['accessToken'];
      refreshToken = data['refreshToken'];
      dio.options.headers['Authorization'] = 'Bearer $accessToken';

      log('서버 로그인 성공! userId=${data['userId']}, '
          'isNew=${data['isNewUser']}, '
          'step=${data['onboardingStep']}');

      if (data['accountStatus'] == 'PENDING_DELETION') {
        log('-> 탈퇴 유예 계정 -> 복구 화면');
      } else if (data['onboardingStep'] == 0) {
        log('-> 온보딩 미시작 -> 프로필 등록');
      } else if (data['onboardingStep'] == 1) {
        log('-> 프로필 완료 -> 이상형 설정');
      } else {
        log('-> 온보딩 완료 -> 홈');
      }
    } catch (e) {
      log('서버 로그인 실패: ${errMsg(e)}');
    }
  }

  // 3. 약관 동의
  Future<void> consentUserTerms() async {
    try {
      await dio.post('$baseUrl/api/consent',
        data: {'consentType': 'USER_TERMS'},
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('서비스 이용약관 동의 완료');
    } catch (e) {
      log('약관 동의 실패: ${errMsg(e)}');
    }
  }

  Future<void> consentAiTerms() async {
    try {
      await dio.post('$baseUrl/api/consent',
        data: {'consentType': 'AI_TERMS'},
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('AI 분석 동의 완료');
    } catch (e) {
      log('AI 동의 실패: ${errMsg(e)}');
    }
  }

  // 4. 닉네임 생성
  Future<void> generateNickname() async {
    try {
      final res = await dio.post('$baseUrl/api/users/nickname/generate');
      generatedNickname = res.data['data']['nickname'];
      log('닉네임 생성: $generatedNickname');
    } catch (e) {
      log('닉네임 생성 실패: ${errMsg(e)}');
    }
  }

  // 5. 프로필 등록
  Future<void> createProfile() async {
    if (generatedNickname == null) {
      log('먼저 닉네임을 생성하세요');
      return;
    }
    try {
      final res = await dio.post('$baseUrl/api/users/profile',
        data: {
          'nickname': generatedNickname,
          'realName': '테스트',
          'birthDate': '2000-01-15',
          'gender': 'MALE',
          'sido': '경기도',
          'sigungu': '성남시',
          'school': '가천대학교',
        },
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('프로필 등록 성공: nickname=${res.data['data']['nickname']}');
    } catch (e) {
      log('프로필 등록 실패: ${errMsg(e)}');
    }
  }

  // 6. 키워드 목록 조회
  Future<void> getKeywords() async {
    try {
      final res = await dio.get('$baseUrl/api/users/ideal-type/keyword-list');
      final keywords = res.data['data']['keywords'] as List;
      log('키워드 ${keywords.length}개: ${keywords.map((k) => k['label']).join(', ')}');
    } catch (e) {
      log('키워드 조회 실패: ${errMsg(e)}');
    }
  }

  // 7. 이상형 설정
  Future<void> saveIdealType() async {
    try {
      final listRes = await dio.get('$baseUrl/api/users/ideal-type/keyword-list');
      final keywords = listRes.data['data']['keywords'] as List;
      if (keywords.length < 3) {
        log('키워드가 3개 미만 (DB 시드 필요)');
        return;
      }
      final ids = keywords.take(3).map((k) => k['id']).toList();

      final res = await dio.post('$baseUrl/api/users/ideal-type/keywords',
        data: {'keywordIds': ids},
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('이상형 설정 완료: ${res.data['data']['keywords']}');
    } catch (e) {
      log('이상형 설정 실패: ${errMsg(e)}');
    }
  }

  // 8. 내 프로필 조회
  Future<void> getMyProfile() async {
    try {
      final res = await dio.get('$baseUrl/api/users/me',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      final data = res.data['data'];
      log('프로필: ${data['nickname']}, '
          'step=${data['onboardingStep']}, '
          'completed=${data['onboardingCompleted']}, '
          'keywords=${data['idealKeywords']?.length ?? 0}개');
    } catch (e) {
      log('프로필 조회 실패: ${errMsg(e)}');
    }
  }

  // 9. 토큰 갱신
  Future<void> refreshTokenApi() async {
    try {
      final res = await dio.post('$baseUrl/api/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      accessToken = res.data['data']['accessToken'];
      refreshToken = res.data['data']['refreshToken'];
      log('토큰 갱신 성공!');
    } catch (e) {
      log('토큰 갱신 실패: ${errMsg(e)}');
    }
  }

  // 10. 로그아웃
  Future<void> logout() async {
    try {
      await dio.post('$baseUrl/api/auth/logout',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('로그아웃 성공!');
      accessToken = null;
      refreshToken = null;
      kakaoAccessToken = null;
    } catch (e) {
      log('로그아웃 실패: ${errMsg(e)}');
    }
  }

  // ── 일기 API ──

  // 11. 당일 일기 확인
  Future<void> checkTodayDiary() async {
    try {
      final res = await dio.get('$baseUrl/api/diaries/today',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      final data = res.data['data'];
      log('당일 일기: exists=${data['exists']}, diaryId=${data['diaryId']}');
    } catch (e) {
      log('당일 일기 확인 실패: ${errMsg(e)}');
    }
  }

  // 12. 일기 작성
  Future<void> createDiary() async {
    try {
      final res = await dio.post('$baseUrl/api/diaries',
        data: {
          'content': '오늘은 정말 좋은 날이었다. 아침에 일어나서 커피를 마시고 산책을 했다. 날씨가 정말 좋아서 기분이 상쾌했다. 공원에서 새소리를 들으며 걷다 보니 마음이 편안해졌다. 요즘 바쁜 일상에서 이런 여유를 즐길 수 있어서 감사하다. 저녁에는 친구와 맛있는 저녁을 먹으며 이런저런 이야기를 나눴다. 서로의 근황을 공유하고 함께 웃는 시간이 참 소중하게 느껴졌다. 매일 이렇게 소소한 행복을 느끼며 살 수 있다면 정말 좋겠다.',
        },
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      final data = res.data['data'];
      log('일기 작성 성공: diaryId=${data['diaryId']}');
    } catch (e) {
      log('일기 작성 실패: ${errMsg(e)}');
    }
  }

  // 13. 일기 목록 조회
  Future<void> getDiaries() async {
    try {
      final res = await dio.get('$baseUrl/api/diaries',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      final data = res.data['data'];
      final diaries = data['diaries'] as List;
      log('일기 ${data['totalCount']}건: ${diaries.map((d) => 'id=${d['diaryId']}').join(', ')}');
    } catch (e) {
      log('일기 목록 실패: ${errMsg(e)}');
    }
  }

  // 14. 일기 상세 조회
  Future<void> getDiaryDetail() async {
    try {
      // 먼저 당일 일기 ID 확인
      final todayRes = await dio.get('$baseUrl/api/diaries/today',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      final diaryId = todayRes.data['data']['diaryId'];
      if (diaryId == null) {
        log('조회할 일기 없음 (먼저 작성하세요)');
        return;
      }
      final res = await dio.get('$baseUrl/api/diaries/$diaryId',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      final data = res.data['data'];
      log('일기 상세: id=${data['diaryId']}, '
          '${data['content'].toString().substring(0, 20)}..., '
          'editable=${data['isEditable']}');
    } catch (e) {
      log('일기 상세 실패: ${errMsg(e)}');
    }
  }

  // 15. 일기 수정
  Future<void> updateDiary() async {
    try {
      final todayRes = await dio.get('$baseUrl/api/diaries/today',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      final diaryId = todayRes.data['data']['diaryId'];
      if (diaryId == null) {
        log('수정할 일기 없음');
        return;
      }
      final res = await dio.patch('$baseUrl/api/diaries/$diaryId',
        data: {
          'content': '수정된 일기 내용입니다. 오늘 하루를 돌아보니 참 많은 일이 있었다. 아침에는 프로젝트 회의가 있었고 점심에는 팀원들과 맛있는 걸 먹었다. 오후에는 코딩에 집중했는데 새로운 기능이 잘 동작해서 기분이 좋았다. 저녁에는 운동을 하고 집에 와서 일기를 쓰고 있다. 내일도 좋은 하루가 되길 바란다. 이런 하루하루가 쌓여서 좋은 추억이 될 것이다. 돌아보면 오늘도 참 감사한 하루였다고 생각한다.',
        },
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('일기 수정 성공: diaryId=${res.data['data']['diaryId']}');
    } catch (e) {
      log('일기 수정 실패: ${errMsg(e)}');
    }
  }

  // 16. 임시저장 생성
  Future<void> createDraft() async {
    try {
      final res = await dio.post('$baseUrl/api/diaries/draft',
        data: {'content': '임시저장 테스트 내용입니다.'},
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('임시저장 성공: draftId=${res.data['data']['draftId']}');
    } catch (e) {
      log('임시저장 실패: ${errMsg(e)}');
    }
  }

  // 17. 임시저장 목록
  Future<void> getDrafts() async {
    try {
      final res = await dio.get('$baseUrl/api/diaries/drafts',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      final data = res.data['data'];
      log('임시저장 ${data['totalCount']}건');
    } catch (e) {
      log('임시저장 목록 실패: ${errMsg(e)}');
    }
  }

  // 18. 헬스체크
  Future<void> healthCheck() async {
    try {
      final res = await dio.get('$baseUrl/api/health');
      log('헬스체크: ${res.data['data']['status']}');
    } catch (e) {
      log('헬스체크 실패: ${errMsg(e)}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ember API Test'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 상태 바
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            color: accessToken != null ? Colors.green.shade900 : Colors.red.shade900,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  accessToken != null ? '서버 로그인됨' : '미로그인',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                if (kakaoAccessToken != null)
                  Text('카카오 AT: ${kakaoAccessToken!.substring(0, 20)}...',
                    style: const TextStyle(fontSize: 11, color: Colors.white70)),
              ],
            ),
          ),

          // 버튼 그리드
          Expanded(
            flex: 1,
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  _btn('헬스체크', healthCheck, Colors.blue),
                  _btn('카카오 로그인', kakaoLogin, Colors.yellow.shade800),
                  _btn('서버 로그인', socialLogin, Colors.orange),
                  _btn('약관동의', consentUserTerms, Colors.deepOrange),
                  _btn('AI동의', consentAiTerms, Colors.deepOrange),
                  _btn('닉네임 생성', generateNickname, Colors.teal),
                  _btn('프로필 등록', createProfile, Colors.purple),
                  _btn('키워드 목록', getKeywords, Colors.cyan),
                  _btn('이상형 설정', saveIdealType, Colors.pink),
                  _btn('내 프로필', getMyProfile, Colors.indigo),
                  // 일기 API
                  _btn('당일일기확인', checkTodayDiary, Colors.green),
                  _btn('일기 작성', createDiary, Colors.green.shade700),
                  _btn('일기 목록', getDiaries, Colors.green.shade800),
                  _btn('일기 상세', getDiaryDetail, Colors.lightGreen),
                  _btn('일기 수정', updateDiary, Colors.lime.shade700),
                  _btn('임시저장', createDraft, Colors.brown),
                  _btn('임시저장목록', getDrafts, Colors.brown.shade700),
                  // 기타
                  _btn('토큰 갱신', refreshTokenApi, Colors.amber),
                  _btn('로그아웃', logout, Colors.red),
                ],
              ),
            ),
          ),

          // 로그 영역
          Expanded(
            flex: 2,
            child: Container(
              width: double.infinity,
              color: Colors.black87,
              child: ListView.builder(
                padding: const EdgeInsets.all(8),
                itemCount: logs.length,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    logs[i],
                    style: TextStyle(
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: logs[i].contains('성공') || logs[i].contains('완료')
                          ? Colors.greenAccent
                          : logs[i].contains('실패')
                              ? Colors.redAccent
                              : logs[i].contains('->')
                                  ? Colors.amberAccent
                                  : Colors.white70,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _btn(String label, VoidCallback onPressed, Color color) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color.withValues(alpha: 0.8),
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      ),
      child: Text(label, style: const TextStyle(fontSize: 13)),
    );
  }
}
