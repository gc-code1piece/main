'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { ADMIN_ROLE_LABELS } from '@/lib/constants';
import { UserPlus, Shield, Trash2, Edit, Key } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 관리자 계정 데이터
const MOCK_ADMINS = [
  {
    id: 1,
    email: 'super@ember.com',
    name: '최고관리자',
    role: 'SUPER_ADMIN',
    isActive: true,
    lastLoginAt: '2024-03-22T09:00:00',
    createdAt: '2024-01-01T00:00:00',
    createdBy: 'SYSTEM',
  },
  {
    id: 2,
    email: 'admin@ember.com',
    name: '운영관리자',
    role: 'ADMIN',
    isActive: true,
    lastLoginAt: '2024-03-22T10:30:00',
    createdAt: '2024-01-15T10:00:00',
    createdBy: 'super@ember.com',
  },
  {
    id: 3,
    email: 'viewer@ember.com',
    name: '뷰어계정',
    role: 'VIEWER',
    isActive: true,
    lastLoginAt: '2024-03-21T14:00:00',
    createdAt: '2024-02-01T09:00:00',
    createdBy: 'super@ember.com',
  },
  {
    id: 4,
    email: 'cs@ember.com',
    name: 'CS팀',
    role: 'ADMIN',
    isActive: true,
    lastLoginAt: '2024-03-20T16:00:00',
    createdAt: '2024-02-15T11:00:00',
    createdBy: 'super@ember.com',
  },
  {
    id: 5,
    email: 'old@ember.com',
    name: '퇴사자',
    role: 'ADMIN',
    isActive: false,
    lastLoginAt: '2024-02-28T18:00:00',
    createdAt: '2024-01-20T10:00:00',
    createdBy: 'super@ember.com',
  },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  VIEWER: 'bg-gray-100 text-gray-800',
};

export default function SystemAccountsPage() {
  const { hasPermission, user } = useAuthStore();
  const [admins, setAdmins] = useState(MOCK_ADMINS);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    name: '',
    role: 'VIEWER',
    password: '',
  });

  const handleAddAdmin = () => {
    if (!newAdmin.email || !newAdmin.name || !newAdmin.password) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }
    const newId = Math.max(...admins.map((a) => a.id)) + 1;
    setAdmins([
      ...admins,
      {
        id: newId,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        isActive: true,
        lastLoginAt: '',
        createdAt: new Date().toISOString(),
        createdBy: user?.email || 'unknown',
      },
    ]);
    setNewAdmin({ email: '', name: '', role: 'VIEWER', password: '' });
    setIsAddingNew(false);
    toast.success('관리자 계정이 생성되었습니다.');
  };

  const handleToggleActive = (id: number) => {
    setAdmins(
      admins.map((admin) =>
        admin.id === id ? { ...admin, isActive: !admin.isActive } : admin
      )
    );
    toast.success('계정 상태가 변경되었습니다.');
  };

  const handleDelete = (id: number) => {
    setAdmins(admins.filter((admin) => admin.id !== id));
    toast.success('계정이 삭제되었습니다.');
  };

  const handleResetPassword = (email: string) => {
    toast.success(`${email}로 비밀번호 재설정 링크가 전송되었습니다.`);
  };

  type AdminRow = (typeof admins)[number];

  const columns: DataTableColumn<AdminRow>[] = useMemo(
    () => [
      {
        key: 'email',
        header: '이메일',
        cell: (admin) => <span className="font-medium">{admin.email}</span>,
      },
      { key: 'name', header: '이름', cell: (admin) => admin.name },
      {
        key: 'role',
        header: '역할',
        cell: (admin) => (
          <Badge className={ROLE_COLORS[admin.role]}>{ADMIN_ROLE_LABELS[admin.role]}</Badge>
        ),
      },
      {
        key: 'status',
        header: '상태',
        cell: (admin) => (
          <Badge variant={admin.isActive ? 'default' : 'secondary'}>
            {admin.isActive ? '활성' : '비활성'}
          </Badge>
        ),
      },
      {
        key: 'lastLoginAt',
        header: '마지막 로그인',
        cell: (admin) => (
          <span className="text-muted-foreground">
            {admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : '-'}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: '생성일',
        cell: (admin) => (
          <span className="text-muted-foreground">{formatDateTime(admin.createdAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: '액션',
        cell: (admin) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleResetPassword(admin.email)}
              title="비밀번호 재설정"
            >
              <Key className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleToggleActive(admin.id)}
              title={admin.isActive ? '비활성화' : '활성화'}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {admin.role !== 'SUPER_ADMIN' && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleDelete(admin.id)}
                title="삭제"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [admins],
  );

  const activeCount = admins.filter((a) => a.isActive).length;

  if (!hasPermission('SUPER_ADMIN')) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Card className="p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">접근 권한이 없습니다</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            이 페이지는 SUPER_ADMIN 권한이 필요합니다.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="관리자 계정 관리"
        description="관리자 계정 생성, 수정, 삭제"
        actions={
          <Button onClick={() => setIsAddingNew(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            새 관리자 추가
          </Button>
        }
      />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{admins.length}</div>
            <p className="text-sm text-muted-foreground">전체 관리자</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-sm text-muted-foreground">활성 계정</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{admins.length - activeCount}</div>
            <p className="text-sm text-muted-foreground">비활성 계정</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {admins.filter((a) => a.role === 'SUPER_ADMIN').length}
            </div>
            <p className="text-sm text-muted-foreground">슈퍼 관리자</p>
          </CardContent>
        </Card>
      </div>

      {/* 새 관리자 추가 폼 */}
      {isAddingNew && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>새 관리자 추가</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ember.com"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role">역할</Label>
                <select
                  id="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                >
                  <option value="VIEWER">뷰어</option>
                  <option value="ADMIN">관리자</option>
                  <option value="SUPER_ADMIN">최고 관리자</option>
                </select>
              </div>
              <div>
                <Label htmlFor="password">임시 비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleAddAdmin}>생성</Button>
              <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 관리자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>관리자 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={admins}
            rowKey={(admin) => admin.id}
            wrapInCard={false}
            rowClassName={(admin) => (!admin.isActive ? 'opacity-50' : undefined)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
