import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(
      userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setUser({ id: docSnapshot.id, ...docSnapshot.data() });
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const formatAnswer = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'Not answered';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-500">User not found</p>
          <button
            onClick={() => navigate('/users')}
            className="mt-4 text-blue-600 hover:text-blue-900"
          >
            ← Back to Users
          </button>
        </div>
      </div>
    );
  }

  const day1Feedback = user.surveys?.day1_feedback || {};
  const outcomeSurvey = user.surveys?.outcome_survey || null;
  const completedSections = user.progress?.completedSections || [];
  const stats = user.stats || {};

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <button
          onClick={() => navigate('/users')}
          className="text-blue-600 hover:text-blue-900 mb-4 inline-flex items-center"
        >
          ← Back to Users
        </button>
        <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
      </div>

      {/* Section A: User Profile */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1 text-sm text-gray-900">{user.name || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user.email || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Profession</label>
            <p className="mt-1 text-sm text-gray-900">{user.profile?.profession || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Organization</label>
            <p className="mt-1 text-sm text-gray-900">{user.profile?.organization || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <p className="mt-1 text-sm text-gray-900">{user.profile?.department || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CTC</label>
            <p className="mt-1 text-sm text-gray-900">{user.profile?.ctc || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Section B: Survey Questions & Answers */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Survey Questions & Answers</h2>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm font-medium text-gray-700">Q: How would you rate the session?</p>
            <p className="mt-1 text-sm text-gray-900">
              A: {day1Feedback.rating ? `${day1Feedback.rating} / 5` : 'Not answered'}
            </p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm font-medium text-gray-700">Q: What was most useful?</p>
            <p className="mt-1 text-sm text-gray-900">A: {formatAnswer(day1Feedback.mostUseful)}</p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm font-medium text-gray-700">Q: What needs improvement?</p>
            <p className="mt-1 text-sm text-gray-900">A: {formatAnswer(day1Feedback.needsImprovement)}</p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm font-medium text-gray-700">Q: Are you interested in paid courses?</p>
            <p className="mt-1 text-sm text-gray-900">A: {formatAnswer(day1Feedback.interestedInPaid)}</p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm font-medium text-gray-700">Q: Expected Outcome?</p>
            <p className="mt-1 text-sm text-gray-900">A: {formatAnswer(outcomeSurvey)}</p>
          </div>
        </div>
      </div>

      {/* Section C: Learning Progress */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Learning Progress</h2>
        {completedSections.length === 0 ? (
          <p className="text-sm text-gray-500">No completed sections</p>
        ) : (
          <div className="space-y-2">
            {completedSections.map((section, index) => (
              <div key={index} className="flex items-center">
                <svg
                  className="h-5 w-5 text-green-500 mr-2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-sm text-gray-900">{section}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section D: Performance Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Correct</label>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {stats.totalCorrect || 0}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Incorrect</label>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {stats.totalIncorrect || 0}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Points</label>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {stats.totalPoints || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
