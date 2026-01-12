import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const usersRef = collection(db, 'users');
    // Use simple query without orderBy to avoid errors if createdAt doesn't exist
    const q = query(usersRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData = [];
        snapshot.forEach((doc) => {
          usersData.push({ id: doc.id, ...doc.data() });
        });
        // Sort alphabetically by name
        usersData.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        console.log('Users fetched:', usersData.length);
        setUsers(usersData);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('❌ Error fetching users:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let errorMessage = 'Failed to fetch users. ';
        if (error.code === 'permission-denied') {
          errorMessage += 'Permission denied. Please check Firestore security rules allow admin users to read data.';
        } else if (error.code === 'unavailable') {
          errorMessage += 'Firestore is unavailable. Please check your internet connection.';
        } else {
          errorMessage += `Error: ${error.message}. Check browser console (F12) for details.`;
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleViewDetails = (userId) => {
    navigate(`/users/${userId}`);
  };

  const getRating = (user) => {
    const rating = user.surveys?.day1_feedback?.rating;
    return rating && typeof rating === 'number' ? rating : null;
  };

  const getTotalPoints = (user) => {
    return user.stats?.totalPoints || 0;
  };

  const getQuestionsCompleted = (user) => {
    const stats = user.stats || {};
    const totalCorrect = stats.totalCorrect || 0;
    const totalIncorrect = stats.totalIncorrect || 0;
    const totalQuestions = totalCorrect + totalIncorrect;
    // Cap at 115 to exclude survey questions (only count quiz/course questions)
    return Math.min(totalQuestions, 115);
  };

  const getProfessionBadgeColor = (profession) => {
    if (!profession || profession === 'N/A') return 'bg-gray-100 text-gray-700';
    const prof = profession.toLowerCase();
    if (prof.includes('fresher') || prof === 'student') return 'bg-green-100 text-green-800';
    if (prof.includes('professional') || prof.includes('working')) return 'bg-blue-100 text-blue-800';
    return 'bg-purple-100 text-purple-800';
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const name = (user.name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const profession = (user.profile?.profession || '').toLowerCase();
    
    return name.includes(query) || email.includes(query) || profession.includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
            <p className="mt-1 text-sm text-gray-500">View and manage all registered users</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md">
              <div className="text-xs font-medium opacity-90">Total Users</div>
              <div className="text-2xl font-bold">
                {searchQuery ? (
                  <>
                    <span className="text-lg">{filteredUsers.length}</span>
                    <span className="text-sm opacity-75"> / {users.length}</span>
                  </>
                ) : (
                  users.length
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or profession..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 via-gray-50 to-gray-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-gradient-to-r from-gray-50 via-gray-50 to-gray-100 z-20">
                  <div className="flex items-center gap-2">
                    <span>#</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[180px]">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[220px]">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[150px]">
                  Profession
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[100px]">
                  Rating
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[120px]">
                  Total Points
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[140px]">
                  Questions Completed
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[140px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-semibold text-lg mb-1">{searchQuery ? 'No users found' : 'No users available'}</p>
                      <p className="text-gray-400 text-sm">{searchQuery ? 'Try a different search term' : 'Users will appear here once they register'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => {
                  const rating = getRating(user);
                  const points = getTotalPoints(user);
                  const questionsCompleted = getQuestionsCompleted(user);
                  const hasName = user.name && user.name.trim() !== '';
                  const hasEmail = user.email && user.email.trim() !== '';
                  
                  return (
                    <tr key={user.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-b border-gray-100">
                      <td className="px-6 py-5 whitespace-nowrap sticky left-0 bg-white z-10 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 font-bold text-sm shadow-sm">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mr-3 shadow-md">
                            <span className="text-white font-bold text-sm">
                              {hasName ? user.name.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-gray-900 truncate">
                              {hasName ? user.name : <span className="text-gray-400 font-normal italic">Not provided</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm text-gray-700 truncate max-w-[220px]" title={user.email || 'No email'}>
                          {hasEmail ? (
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                              </svg>
                              <span className="truncate">{user.email}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Not provided</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {user.profile?.profession ? (
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getProfessionBadgeColor(user.profile.profession)}`}>
                            {user.profile.profession}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            Not specified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {rating ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className={`text-lg ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                                  ★
                                </span>
                              ))}
                            </div>
                            <span className="text-sm font-semibold text-gray-700 ml-1">{rating}/5</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm italic">No rating</span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {points > 0 ? (
                            <>
                              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-bold text-green-600">{points}</span>
                            </>
                          ) : points < 0 ? (
                            <>
                              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-bold text-red-600">{points}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-semibold text-gray-400">{points}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {questionsCompleted > 0 ? (
                            <>
                              <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm font-bold text-blue-600">{questionsCompleted}</span>
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-gray-400">0</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <button
                          onClick={() => handleViewDetails(user.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
