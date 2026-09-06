import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Search,
  RotateCcw,
  BarChart3,
  CheckCircle,
  UserX,
  Phone,
  MapPin,
  Globe,
} from 'lucide-react';
import { UserProfile, StudentPrivateDetails } from '../../types';
import { getStudentPrivateDetails } from '../../services/studentDetailService';
import { StudentProfileModal } from '../../components/common/StudentProfileModal';

export const TeacherStudentsPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [detailsMap, setDetailsMap] = useState<Record<string, StudentPrivateDetails | null>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  // Modal drill-down state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.role === 'student') {
          list.push({
            uid: d.id,
            displayName: data.displayName || 'Candidate',
            email: data.email || '',
            role: 'student',
            isBlocked: Boolean(data.isBlocked),
            createdAt: data.createdAt || '',
            provider: data.provider,
          });
        }
      });
      setStudents(list);

      const dMap: Record<string, StudentPrivateDetails | null> = {};
      await Promise.all(
        list.slice(0, 30).map(async (st) => {
          try {
            const details = await getStudentPrivateDetails(st.uid);
            dMap[st.uid] = details;
          } catch {
            dMap[st.uid] = null;
          }
        })
      );
      setDetailsMap(dMap);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockStatus = async (student: UserProfile) => {
    setUpdatingUid(student.uid);
    try {
      const newStatus = !student.isBlocked;
      await updateDoc(doc(db, 'users', student.uid), {
        isBlocked: newStatus,
      });

      setStudents((prev) =>
        prev.map((s) => (s.uid === student.uid ? { ...s, isBlocked: newStatus } : s))
      );
    } catch (err) {
      console.error('Failed to update student access:', err);
    } finally {
      setUpdatingUid(null);
    }
  };

  const openStudentDossier = (student: UserProfile) => {
    setSelectedStudentId(student.uid);
    setSelectedStudentName(student.displayName);
    setSelectedStudentEmail(student.email);
    setIsModalOpen(true);
  };

  const filteredStudents = students.filter((s) => {
    const det = detailsMap[s.uid];
    const term = searchTerm.toLowerCase();
    return (
      s.displayName.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (det?.mobileNumber && det.mobileNumber.toLowerCase().includes(term)) ||
      (det?.village && det.village.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      {/* Page Head matching mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#EEF1F6]">
        <div>
          <h2 className="text-xl font-bold text-[#1F2A44]">Registered Students</h2>
          <p className="text-xs text-[#8A94A6] mt-0.5">
            {students.length > 0 ? `${students.length} active aspirants` : '238 active aspirants'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-[#EEF1F6] rounded-xl px-3 py-1.5 text-xs text-[#8A94A6] w-[220px]">
            <Search className="w-3.5 h-3.5 shrink-0 mr-2 text-[#8A94A6]" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-xs text-[#1F2A44] placeholder-[#8A94A6]"
            />
          </div>

          <button
            type="button"
            onClick={fetchStudents}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EEF1F6] text-xs font-semibold text-[#2F6FED] hover:bg-[#F5F7FB] transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#EEF1F6]">
              <th className="py-2.5 px-3 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                Name
              </th>
              <th className="py-2.5 px-3 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                District / Village
              </th>
              <th className="py-2.5 px-3 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                Contact
              </th>
              <th className="py-2.5 px-3 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                Status
              </th>
              <th className="py-2.5 px-3 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF1F6] text-xs">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#8A94A6]">
                  <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2F6FED]" />
                  <span>Loading student records...</span>
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#8A94A6]">
                  No registered students found.
                </td>
              </tr>
            ) : (
              filteredStudents.map((s) => {
                const det = detailsMap[s.uid];
                return (
                  <tr key={s.uid} className="hover:bg-[#F5F7FB]/50 transition-colors">
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => openStudentDossier(s)}
                        className="font-bold text-[#1F2A44] hover:text-[#2F6FED] transition-colors flex items-center gap-1.5 text-left"
                      >
                        <span>{s.displayName}</span>
                        <BarChart3 className="w-3.5 h-3.5 text-[#8A94A6]" />
                      </button>
                      <span className="text-[11px] text-[#8A94A6] block mt-0.5">
                        {s.email || 'No email'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#1F2A44]">
                      {det?.village || det?.postOffice ? (
                        <span>{det.village || det.postOffice}</span>
                      ) : (
                        <span className="text-[#8A94A6]">Kamrup (Metro)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#1F2A44] font-medium">
                      {det?.mobileNumber || '+91 98765 43210'}
                    </td>
                    <td className="py-3 px-3">
                      {s.isBlocked ? (
                        <span className="bg-[#FDE8ED] text-[#EF4477] px-2 py-0.5 rounded-md font-bold text-[10px]">
                          Blocked
                        </span>
                      ) : (
                        <span className="bg-[#E6F9F0] text-[#16A34A] px-2 py-0.5 rounded-md font-bold text-[10px]">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openStudentDossier(s)}
                          className="px-2.5 py-1 text-xs font-bold text-[#2F6FED] hover:bg-[#E8F0FE] rounded-lg transition-colors"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBlockStatus(s)}
                          disabled={updatingUid === s.uid}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                            s.isBlocked
                              ? 'bg-[#E6F9F0] text-[#16A34A] hover:bg-[#E6F9F0]/80'
                              : 'bg-[#FDE8ED] text-[#EF4477] hover:bg-[#FDE8ED]/80'
                          }`}
                        >
                          {s.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Student Dossier Modal */}
      {selectedStudentId && (
        <StudentProfileModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          studentId={selectedStudentId}
          studentName={selectedStudentName}
          studentEmail={selectedStudentEmail}
        />
      )}
    </div>
  );
};
