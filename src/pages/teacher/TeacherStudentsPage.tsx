import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  Search,
  CheckCircle2,
  UserX,
  BarChart3,
  ArrowRight,
  Phone,
  Home,
  Building,
  User,
  AlertCircle,
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

      // Fetch private details for each student in parallel
      const detailsEntries = await Promise.all(
        list.map(async (s) => {
          const det = await getStudentPrivateDetails(s.uid);
          return [s.uid, det] as const;
        })
      );
      const newMap: Record<string, StudentPrivateDetails | null> = {};
      detailsEntries.forEach(([uid, det]) => {
        newMap[uid] = det;
      });
      setDetailsMap(newMap);
    } catch (err) {
      console.warn('Could not list users collection directly:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockStatus = async (student: UserProfile) => {
    setUpdatingUid(student.uid);
    try {
      const newBlockedState = !student.isBlocked;
      await updateDoc(doc(db, 'users', student.uid), {
        isBlocked: newBlockedState,
        updatedAt: new Date().toISOString(),
      });
      setStudents((prev) =>
        prev.map((s) => (s.uid === student.uid ? { ...s, isBlocked: newBlockedState } : s))
      );
    } catch (err: any) {
      console.error('Error toggling block status:', err);
      alert(`Could not update student status: ${err.message}`);
    } finally {
      setUpdatingUid(null);
    }
  };

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    const det = detailsMap[s.uid];
    return (
      s.displayName.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (det?.mobile && det.mobile.includes(term)) ||
      (det?.fathersName && det.fathersName.toLowerCase().includes(term)) ||
      (det?.village && det.village.toLowerCase().includes(term)) ||
      (det?.postOffice && det.postOffice.toLowerCase().includes(term))
    );
  });

  const openStudentDossier = (s: UserProfile) => {
    setSelectedStudentId(s.uid);
    setSelectedStudentName(s.displayName || 'Candidate');
    setSelectedStudentEmail(s.email || '');
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Masthead */}
      <div className="bg-[#1B2A4A] text-white p-6 sm:p-8 rounded-xl border border-[#253963] shadow-sm">
        <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-semibold tracking-wider uppercase mb-1">
          <Users className="w-4 h-4" />
          <span>Faculty Roster</span>
        </div>
        <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold">
          Enrolled Candidates & Access Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
          Review enrolled student accounts with verified personal and contact records (Mobile, Father's Name, Village, and P.O.). You can suspend or block individual candidate credentials if examination policy violations occur.
        </p>
      </div>

      {/* Roster Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate by name, email, mobile, father, village..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8F7F4] border border-slate-200 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
            />
          </div>

          <button
            onClick={fetchStudents}
            className="text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#1B2A4A] rounded-lg transition-colors cursor-pointer"
          >
            Refresh Roster
          </button>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F8F7F4] text-[#1B2A4A] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Candidate & Guardian</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">Address (Village & P.O.)</th>
                <th className="py-3 px-4">Enrolled</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    <div className="w-6 h-6 border-2 border-[#1B2A4A]/20 border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-2"></div>
                    Loading student directory & confidential records...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No students found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const det = detailsMap[s.uid];
                  return (
                    <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                      {/* Candidate Name & Father */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => openStudentDossier(s)}
                          className="font-semibold text-[#1B2A4A] hover:text-[#D4AF37] text-left transition-colors flex items-center gap-1.5 group"
                        >
                          <span>{s.displayName}</span>
                          <BarChart3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#D4AF37]" />
                        </button>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Father: </span>
                          <span className="font-medium text-slate-700">
                            {det?.fathersName || 'Not specified'}
                          </span>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">{s.email}</div>
                        <div className="text-xs text-[#1B2A4A] mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {det?.mobile ? (
                            <a
                              href={`tel:${det.mobile}`}
                              className="hover:underline text-[#1B2A4A] font-semibold"
                            >
                              {det.mobile}
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No mobile</span>
                          )}
                        </div>
                      </td>

                      {/* Address: Village & P.O. clearly labeled */}
                      <td className="py-3.5 px-4">
                        {det ? (
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-1 text-slate-700">
                              <span className="font-semibold text-slate-900">Village:</span>
                              <span>{det.village}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <span className="font-semibold text-slate-900">P.O.:</span>
                              <span>{det.postOffice}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Details pending</span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {s.isBlocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            <ShieldAlert className="w-3 h-3" /> Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>

                      {/* Access Control Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openStudentDossier(s)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-[#1B2A4A] text-[#D4AF37] hover:bg-[#253963] rounded transition-colors shadow-2xs cursor-pointer"
                          >
                            <span>Dossier</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => toggleBlockStatus(s)}
                            disabled={updatingUid === s.uid}
                            className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer ${
                              s.isBlocked
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {updatingUid === s.uid
                              ? 'Updating...'
                              : s.isBlocked
                              ? 'Unblock'
                              : 'Block'}
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
      </div>

      {/* Student Profile Modal for Drill-Down */}
      <StudentProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studentId={selectedStudentId}
        studentNameFallback={selectedStudentName}
        studentEmailFallback={selectedStudentEmail}
      />
    </div>
  );
};

