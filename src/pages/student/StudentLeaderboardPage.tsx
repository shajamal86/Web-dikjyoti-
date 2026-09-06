import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchLeaderboard } from '../../services/analyticsService';
import { LeaderboardEntry } from '../../types';
import {
  Trophy,
  Medal,
  Award,
  Search,
  RotateCcw,
  User,
  BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentLeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchLeaderboard(forceRefresh);
      setEntries(data.entries);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const filteredEntries = entries.filter((e) =>
    e.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Page Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#EEF1F6]">
        <div>
          <h2 className="text-xl font-bold text-[#1F2A44]">Rankings</h2>
          <p className="text-xs text-[#8A94A6] mt-0.5">
            All-time leaderboard across every exam
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-[#EEF1F6] rounded-xl px-3 py-1.5 text-xs text-[#8A94A6] w-[200px]">
            <Search className="w-3.5 h-3.5 shrink-0 mr-2 text-[#8A94A6]" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-xs text-[#1F2A44] placeholder-[#8A94A6]"
            />
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EEF1F6] text-xs font-semibold text-[#2F6FED] hover:bg-[#F5F7FB] transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-12 text-center shadow-xs">
          <RotateCcw className="w-6 h-6 animate-spin text-[#2F6FED] mx-auto mb-2" />
          <p className="text-xs font-bold text-[#1F2A44]">Loading Merit Standings...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-10 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1F2A44]">No Rankings Available Yet</h3>
            <p className="text-xs text-[#8A94A6] mt-1">
              Be the first aspirant to complete an exam and top the merit rankings!
            </p>
          </div>
          <div>
            <Link
              to="/student/home?view=live"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2F6FED] text-white text-xs font-bold rounded-xl"
            >
              <BookOpen className="w-4 h-4" />
              <span>Take a Live Test Now</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredEntries.map((item, index) => {
            const rank = index + 1;
            const isMe = item.studentId === user?.uid;

            return (
              <div
                key={item.studentId || index}
                className={`bg-white rounded-[14px] border p-4 shadow-xs transition-all ${
                  isMe
                    ? 'border-[#2F6FED] bg-[#E8F0FE]/50'
                    : 'border-[#EEF1F6] hover:border-[#2F6FED]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Rank Badge / Medal */}
                    {rank === 1 ? (
                      <div className="w-9 h-9 rounded-[10px] bg-[#FFF4E0] text-[#F59E0B] flex items-center justify-center shrink-0">
                        <Trophy className="w-5 h-5" />
                      </div>
                    ) : rank === 2 ? (
                      <div className="w-9 h-9 rounded-[10px] bg-[#EEF1F6] text-[#8A94A6] flex items-center justify-center shrink-0">
                        <Medal className="w-5 h-5" />
                      </div>
                    ) : rank === 3 ? (
                      <div className="w-9 h-9 rounded-[10px] bg-[#FDE8ED] text-[#EF4477] flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-[10px] bg-[#F5F7FB] text-[#2F6FED] font-extrabold text-sm flex items-center justify-center shrink-0">
                        {rank}
                      </div>
                    )}

                    <div>
                      <div className="text-[13.5px] font-bold text-[#1F2A44] leading-snug">
                        {item.studentName} {isMe && <span className="text-[#2F6FED]">(You)</span>}
                      </div>
                      <div className="text-[11px] text-[#8A94A6] mt-0.5">
                        {item.testsCount} tests completed
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[15px] font-extrabold text-[#2F6FED]">
                      {item.totalScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
