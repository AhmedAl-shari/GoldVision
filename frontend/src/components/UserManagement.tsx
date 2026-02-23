import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, deleteUser } from "../lib/api";
import { Trash2, User, Users, Shield, Mail, Calendar, Activity } from "lucide-react";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";

interface UserData {
  id: number;
  email: string;
  name: string | null;
  role: string;
  locale: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  alertsCount: number;
  subscriptionsCount: number;
}

interface UsersResponse {
  users: UserData[];
  total: number;
  active: number;
}

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery<UsersResponse>({
    queryKey: ["admin-users"],
    queryFn: getUsers,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2, // Retry twice on failure
    retryDelay: 1000, // Wait 1 second between retries
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || "Failed to delete user";
      toast.error(errorMessage);
      setDeleteConfirmId(null);
    },
  });

  const handleDelete = (userId: number, email: string) => {
    if (deleteConfirmId === userId) {
      deleteMutation.mutate(userId);
    } else {
      setDeleteConfirmId(userId);
      toast(`Click delete again to confirm deletion of ${email}`, {
        icon: "⚠️",
        duration: 3000,
      });
    }
  };

  // Auto-cancel delete confirmation after 5 seconds
  useEffect(() => {
    if (deleteConfirmId !== null) {
      const timer = setTimeout(() => {
        setDeleteConfirmId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirmId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any)?.response?.data?.detail || 
                        (error as any)?.message || 
                        "Failed to load users. Please try again.";
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
          <Activity className="h-5 w-5" />
          <p className="font-semibold">Failed to load users</p>
        </div>
        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-3">
          {errorMessage}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const users = data?.users || [];
  const totalUsers = data?.total || 0;
  const activeUsers = data?.active || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Users</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active Users</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {activeUsers}
              </p>
            </div>
            <Activity className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Administrators</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {users.filter((u) => u.role === "admin").length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-slate-200/60 bg-white/80 overflow-hidden dark:border-slate-700/60 dark:bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Alerts
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {user.name || user.email}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {user.role === "admin" ? (
                          <>
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          "User"
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            user.isActive
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        />
                        <span className="text-sm text-slate-900 dark:text-white">
                          {user.isActive ? "Active" : "Offline"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {user.alertsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        disabled={deleteMutation.isPending}
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          deleteConfirmId === user.id
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {deleteConfirmId === user.id ? "Confirm Delete" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;

