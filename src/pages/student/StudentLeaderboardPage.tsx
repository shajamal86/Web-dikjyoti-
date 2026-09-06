import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchLeaderboard } from '../../services/analyticsService';
import { LeaderboardEntry } from '../../types';
import {
  Trophy,
  Medal,
  Award,
  Search,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  User,
  ArrowUpRight,
  TrendingUp,
  Target,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdsterraAdBanner } from '../../components/common/AdsterraAdBanner';

export const StudentLeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const myRowRef = useRef<HTMLTableRowElement | null>(null);

  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchLeaderboard(forceRefresh);
      setEntries(data.entries);
      setLastUpdated(data.updatedAt);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Loaded once on page load without live listeners to prevent flickering
    loadData(false);
  }, []);

  const scrollToMyRank = () => {
    if (myRowRef.current) {
      myRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Identify current user entry
  const myEntry = entries.find((e) => e.studentId === user?.uid);

  // Top 3 Podium
  const top1 = entries[0];
  const top2 = entries[1];
  const top3 = entries[2];

  // Filtered entries for search
  const filteredEntries = entries.filter((e) =>
    e.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold tracking-wider text-[#9B93A8] uppercase">
            STATEWIDE MERIT
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#241748] tracking-tight">
            Rankings
          </h1>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#ECE7F5] text-xs font-bold text-[#5B2E9E] hover:bg-[#EDE1FA]/50 transition-colors shadow-xs"
          title="Refresh Leaderboard"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#ECE7F5] p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-[#3E2072] border-t-[#F5A8C6] rounded-full animate-spin mx-auto mb-3"></div>
          <h3 className="text-sm font-bold text-[#241748]">
            Loading Merit Standings...
          </h3>
          <p className="text-xs text-[#9B93A8] mt-1">
            Aggregating examination results across Assam...
          </p>
        </div>
      ) : entries.length === 0 ? (
        /* Honest Empty State */
        <div className="bg-white rounded-2xl border border-[#ECE7F5] p-12 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#EDE1FA] text-[#5B2E9E] mx-auto flex items-center justify-center">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#241748]">
            No Ranked Candidates Yet
          </h3>
          <p className="text-xs text-[#9B93A8] max-w-md mx-auto mt-1 leading-relaxed">
            Examination submissions will appear on this official leaderboard as soon as examinees
            complete and submit their test papers.
          </p>
          <div className="mt-4">
            <Link
              to="/student/home"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5B2E9E] hover:bg-[#4d2487] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <FileText className="w-4 h-4 text-[#F5A8C6]" />
              <span>Take a Live Test Now</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Card matching exact user mockup */}
          <div
            className="rounded-2xl text-white p-4 sm:p-5 relative shadow-sm overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #3E2072, #7C4FD1)',
            }}
          >
            {/* Top Pill */}
            <div className="text-center mb-3">
              <span className="bg-white text-[#3E2072] font-extrabold text-[10px] px-3 py-1 rounded-full tracking-wider shadow-xs uppercase">
                🏆 DIKJYOTI HALL OF FAME
              </span>
            </div>

            {/* Podium Row: col 2 (Rank 2), col 1 (Rank 1 center), col 3 (Rank 3) */}
            <div className="flex justify-center items-end gap-3 sm:gap-6 h-48 pb-1 pt-2">
              {/* Rank 2 (Left) */}
              <div className="flex flex-col items-center w-20 sm:w-24">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#F5A8C6] text-[#3E2072] font-bold flex items-center justify-center text-sm sm:text-base shadow-xs">
                  {top2 ? top2.studentName.charAt(0).toUpperCase() : '2'}
                </div>
                <div className="text-[11px] font-semibold mt-1 max-w-[80px] truncate text-center text-white">
                  {top2 ? top2.studentName : 'Awaiting'}
                </div>
                <div className="text-[10px] text-[#F5A8C6] font-bold">
                  {top2 ? `${top2.totalScore} pts` : '—'}
                </div>
                <div
                  className="w-full rounded-t-lg flex items-center justify-center font-extrabold text-sm text-[#3E2072] mt-1.5 shadow-inner"
                  style={{
                    height: '52px',
                    background: 'linear-gradient(180deg, #F2C9DE, #9B6FE0)',
                  }}
                >
                  2
                </div>
              </div>

              {/* Rank 1 (Center - with crown) */}
              <div className="flex flex-col items-center w-24 sm:w-28">
                <div className="text-lg leading-none mb-0.5 animate-bounce">👑</div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#F5A8C6] text-[#3E2072] font-extrabold flex items-center justify-center text-base sm:text-lg border-2 border-white shadow-md">
                  {top1 ? top1.studentName.charAt(0).toUpperCase() : '1'}
                </div>
                <div className="text-xs font-bold mt-1 max-w-[95px] truncate text-center text-white">
                  {top1 ? top1.studentName : 'Champion'}
                </div>
                <div className="text-[11px] text-[#F5A8C6] font-extrabold">
                  {top1 ? `${top1.totalScore} pts` : '—'}
                </div>
                <div
                  className="w-full rounded-t-lg flex items-center justify-center font-extrabold text-base text-[#3E2072] mt-1.5 shadow-inner"
                  style={{
                    height: '74px',
                    background: 'linear-gradient(180deg, #F2C9DE, #9B6FE0)',
                  }}
                >
                  1
                </div>
              </div>

              {/* Rank 3 (Right) */}
              <div className="flex flex-col items-center w-20 sm:w-24">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F5A8C6] text-[#3E2072] font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs">
                  {top3 ? top3.studentName.charAt(0).toUpperCase() : '3'}
                </div>
                <div className="text-[11px] font-semibold mt-1 max-w-[80px] truncate text-center text-white">
                  {top3 ? top3.studentName : 'Awaiting'}
                </div>
                <div className="text-[10px] text-[#F5A8C6] font-bold">
                  {top3 ? `${top3.totalScore} pts` : '—'}
                </div>
                <div
                  className="w-full rounded-t-lg flex items-center justify-center font-extrabold text-xs text-[#3E2072] mt-1.5 shadow-inner"
                  style={{
                    height: '40px',
                    background: 'linear-gradient(180deg, #F2C9DE, #9B6FE0)',
                  }}
                >
                  3
                </div>
              </div>
            </div>
          </div>

          {/* Start.io Sponsored Announcement Banner */}
          <div className="bg-white rounded-2xl p-3.5 border border-[#ECE7F5] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-[#D1467B] tracking-wider">AD · START.IO</span>
              <span className="text-[9px] text-[#9B93A8]">App ID: 208573210</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#5B2E9E] mt-1">
              ⚡ Dikjyoti Physical Academy & Coaching | Batch Admissions Open
            </div>
            <p className="text-[11px] text-[#9B93A8] mt-0.5 leading-snug">
              Join offline physical training batches with ex-defense instructors in Assam. High success rates for SSC-GD & Assam Police.
            </p>
          </div>

          {/* Search and Candidate Count */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs font-bold text-[#241748]">
              All Candidates ({entries.length})
            </div>
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9B93A8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#ECE7F5] rounded-xl text-[#241748] focus:outline-none focus:border-[#5B2E9E]"
              />
            </div>
          </div>

          {/* Rank Rows matching mockup */}
          <div className="space-y-2">
            {filteredEntries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#ECE7F5] p-8 text-center text-xs text-[#9B93A8]">
                No student matching "{searchQuery}"
              </div>
            ) : (
              filteredEntries.map((row) => {
                const isCurrentUser = row.studentId === user?.uid;

                return (
                  <div
                    key={row.studentId}
                    ref={isCurrentUser ? myRowRef : null}
                    className={`flex items-center gap-3 p-3 bg-white rounded-2xl border transition-all ${
                      isCurrentUser
                        ? 'border-[1.5px] border-[#9B6FE0] bg-[#FAF6FF] shadow-xs'
                        : 'border-[#ECE7F5] shadow-xs hover:border-[#9B6FE0]/40'
                    }`}
                  >
                    {/* Circle Rank Badge */}
                    <div className="w-8 h-8 rounded-full bg-[#F5A8C6] text-[#3E2072] font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0">
                      {row.rank}
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-[#241748] truncate">
                        {row.studentName}{' '}
                        {isCurrentUser && (
                          <span className="text-[#5B2E9E] font-bold text-xs ml-1">(You)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#9B93A8] truncate">
                        {row.bestExamTitle && row.bestExamTitle !== '—'
                          ? row.bestExamTitle
                          : 'Competitive Exam Mock'}{' '}
                        · {row.averagePercentage}% Acc
                      </div>
                    </div>

                    {/* Total Score */}
                    <div className="font-extrabold text-xs sm:text-sm text-[#3E2072] shrink-0 text-right">
                      {row.totalScore} pts
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Adsterra 300x250 Ad Banner */}
          <div className="pt-4 flex justify-center">
            <AdsterraAdBanner />
          </div>
        </>
      )}
    </div>
  );
};
