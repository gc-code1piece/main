import 'package:flutter/material.dart';
import 'dart:ui';
import 'bottom_nav_bar.dart';
import 'api_service.dart';
import 'text_utils.dart';
import 'theme/colors.dart';
import 'theme/typography.dart';
import 'theme/spacing.dart';
import 'widgets/ember_card.dart';

class DiaryDetailScreen extends StatefulWidget {
  final String title;
  final String time;
  final int diaryId;
  final bool showBottomNav;
  final bool showMatchingButtons;
  final bool showDecisionButtons;
  final int? matchingId;
  final String? initialContent;
  final List<String> initialKeywords;

  const DiaryDetailScreen({
    super.key,
    required this.title,
    required this.time,
    required this.diaryId,
    this.showBottomNav = true,
    this.showMatchingButtons = false,
    this.showDecisionButtons = false,
    this.matchingId,
    this.initialContent,
    this.initialKeywords = const [],
  });

  @override
  State<DiaryDetailScreen> createState() => _DiaryDetailScreenState();
}

class _DiaryDetailScreenState extends State<DiaryDetailScreen> {
  int _currentIndex = 0;
  Map<String, dynamic>? _diaryDetail;
  List<String> _keywords = [];
  String _aiComment = '';
  bool _isLoading = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _diaryDetail = {
      if ((widget.initialContent ?? widget.title).isNotEmpty)
        'content': widget.initialContent ?? widget.title,
    };
    _keywords = widget.initialKeywords;
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    try {
      final isExploreOrRequest =
          widget.showDecisionButtons || widget.showMatchingButtons;
      final data = isExploreOrRequest
          ? await ApiService.getDiaryDetail(widget.diaryId)
          : await ApiService.getDiary(widget.diaryId);
      final detail = data['data'] ?? data;
      final fallbackContent = widget.initialContent ?? widget.title;
      setState(() {
        _diaryDetail = {
          if (detail is Map) ...Map<String, dynamic>.from(detail),
          if (fallbackContent.isNotEmpty &&
              (detail is! Map ||
                  (detail['content'] ??
                              detail['contentPreview'] ??
                              detail['previewContent'])
                          ?.toString()
                          .isEmpty !=
                      false))
            'content': fallbackContent,
        };
        _keywords = detail is Map
            ? _parseKeywords(Map<dynamic, dynamic>.from(detail))
            : widget.initialKeywords;
        _aiComment = detail is Map
            ? detail['aiComment'] ?? detail['summary'] ?? ''
            : '';
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<String> _parseKeywords(Map<dynamic, dynamic> detail) {
    final keywords = <String>[];

    void addValue(dynamic value) {
      if (value == null) return;
      if (value is List) {
        for (final item in value) {
          addValue(item);
        }
        return;
      }
      if (value is Map) {
        addValue(
          value['label'] ?? value['name'] ?? value['tag'] ?? value['keyword'],
        );
        return;
      }
      final text = decodeHtmlEntities(value.toString()).trim();
      if (text.isNotEmpty && !keywords.contains(text)) {
        keywords.add(text);
      }
    }

    for (final key in const [
      'keywords',
      'personalityKeywords',
      'moodTags',
      'emotionTags',
      'lifestyleTags',
      'toneTags',
    ]) {
      addValue(detail[key]);
    }

    if (keywords.isEmpty) return widget.initialKeywords;
    return keywords;
  }

  Future<void> _selectMatching() async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);
    final success = await ApiService.selectMatching(widget.diaryId);

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(success ? '신청했어요' : '신청할 수 없어요')));
    if (success) Navigator.pop(context);
  }

  Future<void> _skipMatching() async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);
    await ApiService.skipMatching(widget.diaryId);

    if (!mounted) return;
    setState(() => _isSubmitting = false);
    Navigator.pop(context);
  }

  Future<void> _acceptMatching() async {
    if (_isSubmitting || widget.matchingId == null) return;

    setState(() => _isSubmitting = true);
    final result = await ApiService.acceptMatchingResponse(widget.matchingId!);
    final code = result['code']?.toString();
    final success =
        code == '200' ||
        code == '201' ||
        result['data']?['status']?.toString() == 'MATCHED';
    final message = result['message']?.toString();

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(success ? '수락했어요' : message ?? '수락할 수 없어요')),
    );
    if (success) Navigator.pop(context, true);
  }

  Future<void> _editDiary() async {
    final currentContent = decodeHtmlEntities(
      _diaryDetail?['content'] ??
          _diaryDetail?['contentPreview'] ??
          _diaryDetail?['previewContent'] ??
          widget.initialContent ??
          widget.title,
    );
    final controller = TextEditingController(text: currentContent);
    final updated = await showDialog<String>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('일기 수정'),
          content: SizedBox(
            width: double.maxFinite,
            child: TextField(
              controller: controller,
              minLines: 8,
              maxLines: 12,
              maxLength: 1000,
              decoration: const InputDecoration(
                hintText: '수정할 일기 내용을 입력해주세요.',
                border: OutlineInputBorder(),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('취소'),
            ),
            ElevatedButton(
              onPressed: () {
                final text = controller.text.trim();
                if (text.length < 200) {
                  ScaffoldMessenger.of(dialogContext).showSnackBar(
                    const SnackBar(content: Text('일기는 200자 이상 작성해주세요.')),
                  );
                  return;
                }
                Navigator.pop(dialogContext, text);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: EmberColors.primary,
              ),
              child: const Text('저장', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
    controller.dispose();
    if (updated == null || updated == currentContent || _isSubmitting) return;

    setState(() => _isSubmitting = true);
    try {
      await ApiService.updateDiary(diaryId: widget.diaryId, content: updated);
      if (!mounted) return;
      setState(() {
        _diaryDetail = {...?_diaryDetail, 'content': updated};
        _isSubmitting = false;
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('일기를 수정했어요.')));
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('일기 수정 실패: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EmberColors.primary,
      body: SafeArea(
        child: Column(
          children: [
            // 상단
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.chevron_left,
                      size: 28,
                      color: EmberColors.textPrimary,
                    ),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const Text(
                    'Diary',
                    style: TextStyle(
                      color: EmberColors.textOnPrimary,
                      fontSize: 30,
                      fontFamily: 'Pretendard',
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      widget.showDecisionButtons || widget.showMatchingButtons
                          ? Icons.close
                          : Icons.edit_outlined,
                      size: 24,
                      color: EmberColors.textPrimary,
                    ),
                    onPressed:
                        widget.showDecisionButtons || widget.showMatchingButtons
                        ? () => Navigator.popUntil(
                            context,
                            (route) => route.isFirst,
                          )
                        : _editDiary,
                  ),
                ],
              ),
            ),

            // 일기 카드
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
                ),
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: EmberColors.primary,
                        ),
                      )
                    : _buildCardContent(),
              ),
            ),
            _buildActionButtons(),
          ],
        ),
      ),

      bottomNavigationBar: widget.showBottomNav
          ? BottomNavBar(
              currentIndex: _currentIndex,
              onTap: (i) {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/home',
                  (route) => false,
                  arguments: i,
                );
              },
            )
          : null,
    );
  }

  Widget _buildActionButtons() {
    final isRequest = widget.showMatchingButtons;
    final isDecision = widget.showDecisionButtons;

    if (!isRequest && !isDecision) {
      return const SizedBox.shrink();
    }

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
      child: Row(
        children: [
          if (isRequest) ...[
            Expanded(
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: EmberColors.buttonSecondary,
                  disabledBackgroundColor: EmberColors.buttonDisabled,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  elevation: 0,
                ),
                child: const Text(
                  '거절',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontFamily: 'Pretendard',
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _acceptMatching,
                style: ElevatedButton.styleFrom(
                  backgroundColor: EmberColors.primary,
                  disabledBackgroundColor: EmberColors.primaryLight,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  elevation: 0,
                ),
                child: const Text(
                  '수락',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontFamily: 'Pretendard',
                  ),
                ),
              ),
            ),
          ] else ...[
            Expanded(
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _selectMatching,
                style: ElevatedButton.styleFrom(
                  backgroundColor: EmberColors.primary,
                  disabledBackgroundColor: EmberColors.primaryLight,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  elevation: 0,
                ),
                child: const Text(
                  '교환일기 신청하기',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontFamily: 'Pretendard',
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCardContent() {
    final shouldBlur = widget.showDecisionButtons || widget.showMatchingButtons;
    final content = decodeHtmlEntities(
      _diaryDetail?['content'] ??
          _diaryDetail?['contentPreview'] ??
          _diaryDetail?['previewContent'] ??
          widget.initialContent ??
          widget.title,
    );

    return Padding(
      padding: const EdgeInsets.all(20),
      child: SingleChildScrollView(
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            constraints: BoxConstraints(
              minHeight: shouldBlur ? 220 : 260,
              maxHeight: MediaQuery.of(context).size.height * 0.48,
            ),
            decoration: BoxDecoration(
              color: shouldBlur
                  ? EmberColors.surfaceGray
                  : EmberColors.backgroundWarm,
              borderRadius: BorderRadius.circular(20),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Stack(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: SingleChildScrollView(
                      physics: shouldBlur
                          ? const NeverScrollableScrollPhysics()
                          : const BouncingScrollPhysics(),
                      child: Text(
                        content,
                        style: const TextStyle(
                          color: Colors.black,
                          fontSize: 13,
                          fontFamily: 'Pretendard',
                          height: 2.0,
                        ),
                      ),
                    ),
                  ),
                  if (shouldBlur)
                    Positioned.fill(
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4),
                        child: Container(
                          color: Colors.white.withValues(alpha: 0.05),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          // 카테고리 (독립 섹션, 다른 색)
          if (_diaryDetail?['category'] != null) ...[
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F4FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBFD4FF), width: 1),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.local_offer_outlined, size: 14, color: Color(0xFF5B7FC7)),
                    const SizedBox(width: 6),
                    Text(
                      _diaryDetail!['category'].toString(),
                      style: const TextStyle(color: Color(0xFF3D5A99), fontSize: 12, fontFamily: 'Pretendard', fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],

          // 유사도 배지
          if (_diaryDetail?['similarityBadge'] != null) ...[
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: EmberColors.backgroundPink,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '♡ ${_diaryDetail!['similarityBadge']}',
                  style: const TextStyle(color: EmberColors.primary, fontSize: 12, fontFamily: 'Pretendard', fontWeight: FontWeight.w600),
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],

          // 감정/성격 키워드 태그
          if (_keywords.isNotEmpty)
            Center(
              child: Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: _keywords.map((tag) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: EmberColors.backgroundPeach,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: EmberColors.primary.withValues(alpha: 0.2), width: 0.5),
                ),
                child: Text(
                  tag,
                  style: const TextStyle(
                    color: EmberColors.primary,
                    fontSize: 13,
                    fontFamily: 'Pretendard',
                    fontWeight: FontWeight.w500,
                  ),
                ),
              )).toList(),
            )),

          const SizedBox(height: 20),

          // AI 분석 코멘트
          Text(
            _aiComment.isEmpty
                ? widget.showDecisionButtons
                      ? '이 사람과 교환일기를 시작하고 싶다면 아래 버튼을 눌러주세요.'
                      : ''
                : _aiComment,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.black,
              fontSize: 12,
              fontFamily: 'Pretendard',
              fontWeight: FontWeight.w400,
              height: 2.0,
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
      ),
    );
  }
}
