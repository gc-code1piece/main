'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import Pagination from '@/components/common/Pagination';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { Eye } from 'lucide-react';

// Mock data for development
const MOCK_USERS = [
  {
    id: 1,
    nickname: '별빛소녀',
    realName: '김민지',
    gender: 'FEMALE' as const,
    region: '서울',
    status: 'ACTIVE' as const,
    diaryCount: 15,
    matchCount: 3,
    createdAt: '2024-03-01T10:00:00',
  },
  {
    id: 2,
    nickname: '달빛청년',
    realName: '이준호',
    gender: 'MALE' as const,
    region: '부산',
    status: 'SUSPEND_7D' as const,
    diaryCount: 8,
    matchCount: 1,
    createdAt: '2024-03-05T14:30:00',
  },
  {
    id: 3,
    nickname: '햇살가득',
    realName: '박서연',
    gender: 'FEMALE' as const,
    region: '인천',
    status: 'ACTIVE' as const,
    diaryCount: 22,
    matchCount: 5,
    createdAt: '2024-02-20T11:00:00',
  },
  {
    id: 4,
    nickname: '밤하늘별',
    realName: '최민수',
    gender: 'MALE' as const,
    region: '대전',
    status: 'ACTIVE' as const,
    diaryCount: 10,
    matchCount: 2,
    createdAt: '2024-02-25T09:30:00',
  },
  {
    id: 5,
    nickname: '꽃구름',
    realName: '정유진',
    gender: 'FEMALE' as const,
    region: '광주',
    status: 'BANNED' as const,
    diaryCount: 3,
    matchCount: 0,
    createdAt: '2024-03-10T16:00:00',
  },
  {
    id: 6,
    nickname: '바람처럼',
    realName: '김태현',
    gender: 'MALE' as const,
    region: '서울',
    status: 'ACTIVE' as const,
    diaryCount: 18,
    matchCount: 4,
    createdAt: '2024-01-15T14:00:00',
  },
  {
    id: 7,
    nickname: '달콤한하루',
    realName: '이수민',
    gender: 'FEMALE' as const,
    region: '경기',
    status: 'ACTIVE' as const,
    diaryCount: 25,
    matchCount: 6,
    createdAt: '2024-01-10T10:00:00',
  },
  {
    id: 8,
    nickname: '푸른바다',
    realName: '박준영',
    gender: 'MALE' as const,
    region: '부산',
    status: 'SUSPEND_7D' as const,
    diaryCount: 5,
    matchCount: 1,
    createdAt: '2024-03-08T12:00:00',
  },
];

type MemberRow = (typeof MOCK_USERS)[number];

// 숫자 컬럼(일기/매칭)은 DataTable 의 align='right' 로 font-mono-data tabular-nums 자동 적용.
const columns: DataTableColumn<MemberRow>[] = [
  {
    key: 'nickname',
    header: '닉네임',
    cell: (user) => <span className="font-medium">{user.nickname}</span>,
  },
  { key: 'realName', header: '실명', cell: (user) => user.realName },
  {
    key: 'gender',
    header: '성별',
    cell: (user) => (user.gender === 'MALE' ? '남성' : '여성'),
  },
  { key: 'region', header: '지역', cell: (user) => user.region },
  {
    key: 'status',
    header: '상태',
    cell: (user) => <StatusBadge status={user.status} />,
  },
  { key: 'diaryCount', header: '일기', align: 'right', cell: (user) => user.diaryCount },
  { key: 'matchCount', header: '매칭', align: 'right', cell: (user) => user.matchCount },
  {
    key: 'createdAt',
    header: '가입일',
    cell: (user) => (
      <span className="text-muted-foreground">{formatDateTime(user.createdAt)}</span>
    ),
  },
  {
    key: 'actions',
    header: '액션',
    cell: (user) => (
      <Link href={`/admin/members/${user.id}`}>
        <Button variant="ghost" size="xs">
          <Eye className="mr-1 h-4 w-4" />
          상세
        </Button>
      </Link>
    ),
  },
];

export default function UsersPage() {
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState('');

  const handleSearch = () => {
    setPage(0);
  };

  // 키워드 기반 필터링 (닉네임 또는 실명 포함 여부)
  const filteredUsers = keyword
    ? MOCK_USERS.filter(
        (user) =>
          user.nickname.includes(keyword) || user.realName.includes(keyword)
      )
    : MOCK_USERS;

  const totalPages = Math.ceil(filteredUsers.length / 20) || 1;

  return (
    <div>
      <PageHeader
        title="회원 관리"
        description="전체 회원 목록 조회 및 관리"
      />

      <div className="mb-6">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          placeholder="닉네임 또는 이름 검색"
          onSearch={handleSearch}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        rowKey={(user) => user.id}
        emptyState="검색 결과가 없습니다."
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
