import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    freshers: 0,
    workingProfessionals: 0,
    averageRating: 0,
    roleSwitchCount: 0,
    fullCourseCompleted: 0,
    certificateCount: 0,
    certificateDownloadedCount: 0,
  });
  const [fullCourseUsers, setFullCourseUsers] = useState([]);
  const [dailyLogins, setDailyLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError(null);
        console.log('Starting to fetch data from Firestore...');
        
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          console.log('✅ Total documents fetched:', querySnapshot.size);
          
          if (querySnapshot.empty) {
            console.warn('⚠️ No documents found in users collection');
            setError('No users found in Firestore. Please check if data exists.');
            setLoading(false);
            return;
          }

          let totalUsers = 0;
          let freshers = 0;
          let workingProfessionals = 0;
          let totalRating = 0;
          let ratingCount = 0;
          let roleSwitchCount = 0;
          let fullCourseCompleted = 0;
          let certificateCount = 0;
          let certificateDownloadedCount = 0;
          const fullCourseUsersList = [];
          const dailyLoginMap = new Map(); // Map to track logins by date

          querySnapshot.forEach((doc) => {
            const userData = doc.data();
            
            // Skip admin users from statistics
            const userRole = userData.profile?.role || '';
            if (userRole === 'admin') {
              return;
            }

            totalUsers++;

            // Track daily logins - check for createdAt, lastLogin, or registration date
            const createdAt = userData.createdAt || userData.created_at || userData.registrationDate || userData.registration_date;
            const lastLogin = userData.lastLogin || userData.last_login || userData.lastSeen || userData.last_seen;
            
            // Use createdAt if available, otherwise use lastLogin
            let loginDate = null;
            if (createdAt) {
              // Handle Firestore Timestamp or regular date
              if (createdAt.toDate && typeof createdAt.toDate === 'function') {
                loginDate = createdAt.toDate();
              } else if (createdAt.seconds) {
                // Firestore Timestamp object
                loginDate = new Date(createdAt.seconds * 1000);
              } else {
                loginDate = new Date(createdAt);
              }
            } else if (lastLogin) {
              // Handle Firestore Timestamp or regular date
              if (lastLogin.toDate && typeof lastLogin.toDate === 'function') {
                loginDate = lastLogin.toDate();
              } else if (lastLogin.seconds) {
                // Firestore Timestamp object
                loginDate = new Date(lastLogin.seconds * 1000);
              } else {
                loginDate = new Date(lastLogin);
              }
            }
            
            if (loginDate && !isNaN(loginDate.getTime())) {
              // Format date as YYYY-MM-DD
              const dateKey = loginDate.toISOString().split('T')[0];
              dailyLoginMap.set(dateKey, (dailyLoginMap.get(dateKey) || 0) + 1);
            }

            // Count profession type
            const profession = (userData.profile?.profession || '').toLowerCase().trim();
            if (profession === '' || profession === 'n/a') {
              // Don't count if profession is empty
            } else if (
              profession.includes('fresher') || 
              profession === 'student' ||
              profession.includes('student') ||
              profession.includes('graduate')
            ) {
              freshers++;
            } else if (profession) {
              workingProfessionals++;
            }

            // Calculate average rating
            const rating = userData.surveys?.day1_feedback?.rating;
            if (rating && typeof rating === 'number' && rating >= 1 && rating <= 5) {
              totalRating += rating;
              ratingCount++;
            }

            // Count role switch
            const outcome = userData.surveys?.outcome_survey;
            if (outcome && typeof outcome === 'string' && outcome.toLowerCase().trim() === 'role switch') {
              roleSwitchCount++;
            }

            // Check course completion - multiple ways to detect full course completion
            const completedSections = userData.progress?.completedSections || [];
            const sectionsLower = completedSections.map(s => String(s).toLowerCase());
            
            // Check for certificate - comprehensive detection across all possible fields
            const hasCertificate = 
              // Direct certificate fields
              userData.certificate || 
              userData.certificates || 
              userData.certificateIssued ||
              userData.hasCertificate ||
              userData.certificateUrl ||
              userData.certificate_url ||
              userData.certificateDownloaded ||
              userData.certificate_downloaded ||
              userData.certificateGenerated ||
              userData.certificate_generated ||
              // Progress nested fields
              userData.progress?.certificate ||
              userData.progress?.certificates ||
              userData.progress?.certificateIssued ||
              userData.progress?.certificateUrl ||
              userData.progress?.certificate_url ||
              userData.progress?.hasCertificate ||
              // Check if certificate is an object (not null/undefined)
              (userData.certificate && typeof userData.certificate === 'object' && Object.keys(userData.certificate).length > 0) ||
              (userData.progress?.certificate && typeof userData.progress.certificate === 'object' && Object.keys(userData.progress.certificate).length > 0) ||
              // Check if certificate is a string/number (non-empty)
              (typeof userData.certificate === 'string' && userData.certificate.trim() !== '') ||
              (typeof userData.progress?.certificate === 'string' && userData.progress.certificate.trim() !== '') ||
              // Check boolean flags
              userData.progress?.certificate === true ||
              userData.progress?.certificateIssued === true ||
              userData.progress?.hasCertificate === true ||
              // Check string values
              userData.progress?.certificate === 'issued' ||
              userData.progress?.certificateIssued === 'issued' ||
              userData.progress?.certificate === 'true' ||
              // Check completedSections for certificate-related entries
              sectionsLower.some(s => 
                s.includes('certificate') || 
                s.includes('cert') ||
                s.includes('certified')
              ) ||
              // Check all user data keys for certificate-related fields
              Object.keys(userData).some(key => 
                key.toLowerCase().includes('cert') && 
                userData[key] !== null && 
                userData[key] !== undefined && 
                userData[key] !== false &&
                userData[key] !== ''
              ) ||
              // Check progress keys
              (userData.progress && Object.keys(userData.progress).some(key => 
                key.toLowerCase().includes('cert') && 
                userData.progress[key] !== null && 
                userData.progress[key] !== undefined && 
                userData.progress[key] !== false &&
                userData.progress[key] !== ''
              ));
            
            // Check if day1 is completed - multiple indicators
            const hasDay1Feedback = !!userData.surveys?.day1_feedback;
            const hasDay1InSections = sectionsLower.some(s => 
              s.includes('day1') || 
              s.includes('day 1') || 
              s.includes('day-1') ||
              s === 'day1' ||
              s === 'day 1' ||
              s.includes('day1completed') ||
              s.includes('day 1 completed')
            );
            const hasDay1Flag = userData.day1Completed === true || 
                               userData.progress?.day1Completed === true ||
                               userData.completed?.day1 === true;
            
            // Day1 is completed if any indicator is true
            const hasDay1 = hasDay1InSections || hasDay1Flag || hasDay1Feedback;
            
            // Check if day2 is completed - multiple indicators
            const hasDay2Feedback = !!userData.surveys?.day2_feedback;
            const hasDay2InSections = sectionsLower.some(s => 
              s.includes('day2') || 
              s.includes('day 2') || 
              s.includes('day-2') ||
              s === 'day2' ||
              s === 'day 2' ||
              s.includes('day2completed') ||
              s.includes('day 2 completed')
            );
            const hasDay2Flag = userData.day2Completed === true || 
                               userData.progress?.day2Completed === true ||
                               userData.completed?.day2 === true;
            
            // Day2 is completed if any indicator is true
            const hasDay2 = hasDay2InSections || hasDay2Flag || hasDay2Feedback;
            
            // Count certificate issuance separately
            if (hasCertificate) {
              certificateCount++;
            }

            // Check for certificate download - comprehensive detection
            const hasCertificateDownloaded = 
              // Direct download fields
              userData.certificateDownloaded ||
              userData.certificate_downloaded ||
              userData.certificateDownloadedAt ||
              userData.certificate_downloaded_at ||
              userData.downloadedCertificate ||
              userData.downloaded_certificate ||
              userData.hasDownloadedCertificate ||
              // Progress nested fields
              userData.progress?.certificateDownloaded ||
              userData.progress?.certificate_downloaded ||
              userData.progress?.certificateDownloadedAt ||
              userData.progress?.downloadedCertificate ||
              userData.progress?.hasDownloadedCertificate ||
              // Check if certificate object has download property
              (userData.certificate && typeof userData.certificate === 'object' && (
                userData.certificate.downloaded === true ||
                userData.certificate.downloadedAt ||
                userData.certificate.isDownloaded === true
              )) ||
              (userData.progress?.certificate && typeof userData.progress.certificate === 'object' && (
                userData.progress.certificate.downloaded === true ||
                userData.progress.certificate.downloadedAt ||
                userData.progress.certificate.isDownloaded === true
              )) ||
              // Check boolean flags
              userData.progress?.certificateDownloaded === true ||
              userData.progress?.hasDownloadedCertificate === true ||
              // Check string values
              userData.progress?.certificateDownloaded === 'true' ||
              userData.progress?.certificateDownloaded === 'downloaded' ||
              // Check completedSections for download-related entries
              sectionsLower.some(s => 
                (s.includes('certificate') || s.includes('cert')) && 
                (s.includes('download') || s.includes('downloaded'))
              ) ||
              // Check all user data keys for download-related certificate fields
              Object.keys(userData).some(key => {
                const keyLower = key.toLowerCase();
                return (keyLower.includes('cert') && keyLower.includes('download')) && 
                  userData[key] !== null && 
                  userData[key] !== undefined && 
                  userData[key] !== false &&
                  userData[key] !== '';
              }) ||
              // Check progress keys
              (userData.progress && Object.keys(userData.progress).some(key => {
                const keyLower = key.toLowerCase();
                return (keyLower.includes('cert') && keyLower.includes('download')) && 
                  userData.progress[key] !== null && 
                  userData.progress[key] !== undefined && 
                  userData.progress[key] !== false &&
                  userData.progress[key] !== '';
              }));

            // Count certificate downloads
            if (hasCertificateDownloaded) {
              certificateDownloadedCount++;
            }

            // Full course completion: certificate issued OR both days completed
            const hasFullCourse = hasCertificate || (hasDay1 && hasDay2);

            // Count full course completion and add to list
            if (hasFullCourse) {
              fullCourseCompleted++;
              const stats = userData.stats || {};
              const totalCorrect = stats.totalCorrect || 0;
              const totalIncorrect = stats.totalIncorrect || 0;
              const totalQuestions = totalCorrect + totalIncorrect;
              // Cap at 115 to exclude survey questions (only count quiz/course questions)
              const questionsCompleted = Math.min(totalQuestions, 115);
              
              // Debug: Log first few users to verify real data
              if (fullCourseUsersList.length < 3) {
                console.log('📊 Real Data from Firestore:', {
                  userId: doc.id,
                  name: userData.name,
                  stats: {
                    totalCorrect: totalCorrect,
                    totalIncorrect: totalIncorrect,
                    totalQuestions: totalQuestions,
                    cappedAt: questionsCompleted
                  }
                });
              }
              
              fullCourseUsersList.push({
                id: doc.id,
                name: userData.name || 'Unknown',
                email: userData.email || 'No email',
                questionsCompleted: questionsCompleted,
              });
            }
          });

          // Debug: Log sample user data and completion detection
          if (querySnapshot.size > 0) {
            // Find a non-admin user for debugging
            let sampleUser = null;
            let sampleUserId = null;
            for (let i = 0; i < querySnapshot.docs.length; i++) {
              const user = querySnapshot.docs[i].data();
              const userRole = user.profile?.role || '';
              if (userRole !== 'admin') {
                sampleUser = user;
                sampleUserId = querySnapshot.docs[i].id;
                break;
              }
            }
            
            if (sampleUser) {
              const sampleCompletedSections = sampleUser.progress?.completedSections || [];
              const sampleSectionsLower = sampleCompletedSections.map(s => String(s).toLowerCase());
              
              // Comprehensive certificate check for debugging
              const certChecks = {
                direct: {
                  certificate: sampleUser.certificate,
                  certificates: sampleUser.certificates,
                  certificateIssued: sampleUser.certificateIssued,
                  hasCertificate: sampleUser.hasCertificate,
                  certificateUrl: sampleUser.certificateUrl,
                  certificate_url: sampleUser.certificate_url,
                },
                progress: sampleUser.progress ? {
                  certificate: sampleUser.progress.certificate,
                  certificates: sampleUser.progress.certificates,
                  certificateIssued: sampleUser.progress.certificateIssued,
                  certificateUrl: sampleUser.progress.certificateUrl,
                  hasCertificate: sampleUser.progress.hasCertificate,
                } : null,
                allKeys: Object.keys(sampleUser).filter(k => k.toLowerCase().includes('cert')),
                progressKeys: sampleUser.progress ? Object.keys(sampleUser.progress).filter(k => k.toLowerCase().includes('cert')) : [],
                completedSectionsWithCert: sampleSectionsLower.filter(s => s.includes('cert') || s.includes('certified')),
              };
              
              // Check for download fields
              const downloadChecks = {
                direct: {
                  certificateDownloaded: sampleUser.certificateDownloaded,
                  certificate_downloaded: sampleUser.certificate_downloaded,
                  certificateDownloadedAt: sampleUser.certificateDownloadedAt,
                  downloadedCertificate: sampleUser.downloadedCertificate,
                },
                progress: sampleUser.progress ? {
                  certificateDownloaded: sampleUser.progress.certificateDownloaded,
                  certificate_downloaded: sampleUser.progress.certificate_downloaded,
                  downloadedCertificate: sampleUser.progress.downloadedCertificate,
                } : null,
                allKeys: Object.keys(sampleUser).filter(k => {
                  const keyLower = k.toLowerCase();
                  return (keyLower.includes('cert') && keyLower.includes('download'));
                }),
                progressKeys: sampleUser.progress ? Object.keys(sampleUser.progress).filter(k => {
                  const keyLower = k.toLowerCase();
                  return (keyLower.includes('cert') && keyLower.includes('download'));
                }) : [],
              };

              console.log('🔍 Certificate Detection Debug:', {
                userId: sampleUserId,
                certificateChecks: certChecks,
                downloadChecks: downloadChecks,
                detectedCertificate: !!(sampleUser.certificate || 
                  sampleUser.certificates || 
                  sampleUser.certificateIssued ||
                  sampleUser.progress?.certificate ||
                  sampleUser.progress?.certificateIssued ||
                  certChecks.allKeys.length > 0 ||
                  certChecks.progressKeys.length > 0 ||
                  certChecks.completedSectionsWithCert.length > 0),
                detectedDownload: !!(downloadChecks.allKeys.length > 0 ||
                  downloadChecks.progressKeys.length > 0 ||
                  sampleUser.certificateDownloaded ||
                  sampleUser.progress?.certificateDownloaded),
                allUserKeys: Object.keys(sampleUser),
                progressKeys: sampleUser.progress ? Object.keys(sampleUser.progress) : [],
              });
            }
          }
          
          // Process daily login data - get last 30 days
          const today = new Date();
          const last30Days = [];
          for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const count = dailyLoginMap.get(dateKey) || 0;
            last30Days.push({
              date: dateKey,
              count: count,
              displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            });
          }

          console.log('Stats calculated:', { totalUsers, freshers, workingProfessionals, roleSwitchCount, fullCourseCompleted, certificateCount, certificateDownloadedCount });
          console.log('Daily logins (last 30 days):', last30Days);

          setStats({
            totalUsers,
            freshers,
            workingProfessionals,
            averageRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 0,
            roleSwitchCount,
            fullCourseCompleted,
            certificateCount,
            certificateDownloadedCount,
          });
          setFullCourseUsers(fullCourseUsersList);
          setDailyLogins(last30Days);
          setLoading(false);
        }, (error) => {
          console.error('❌ Error fetching stats:', error);
          let errorMessage = 'Failed to fetch data. ';
          if (error.code === 'permission-denied') {
            errorMessage += 'Permission denied. Please check Firestore security rules.';
          } else if (error.code === 'unavailable') {
            errorMessage += 'Firestore is unavailable. Please check your internet connection.';
          } else {
            errorMessage += `Error: ${error.message}`;
          }
          setError(errorMessage);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('❌ Error setting up listener:', error);
        setError(`Error: ${error.message}`);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const professionData = {
    labels: ['Freshers', 'Working Professionals'],
    datasets: [
      {
        label: 'Users',
        data: [stats.freshers, stats.workingProfessionals],
        backgroundColor: ['#10B981', '#3B82F6'],
        borderColor: ['#059669', '#2563EB'],
        borderWidth: 3,
      },
    ],
  };

  const roleSwitchData = {
    labels: ['Role Switch', 'Other Outcomes'],
    datasets: [
      {
        label: 'Users',
        data: [
          stats.roleSwitchCount,
          Math.max(0, stats.totalUsers - stats.roleSwitchCount),
        ],
        backgroundColor: ['#F59E0B', '#E5E7EB'],
        borderColor: ['#D97706', '#D1D5DB'],
        borderWidth: 3,
      },
    ],
  };

  const fullCourseData = {
    labels: ['Full Course Completed', 'Not Completed'],
    datasets: [
      {
        label: 'Number of Users',
        data: [
          stats.fullCourseCompleted,
          Math.max(0, stats.totalUsers - stats.fullCourseCompleted),
        ],
        backgroundColor: ['#8B5CF6', '#E5E7EB'],
        borderColor: ['#7C3AED', '#D1D5DB'],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const certificateData = {
    labels: ['Certificate Issued', 'No Certificate'],
    datasets: [
      {
        label: 'Users',
        data: [
          stats.certificateCount,
          Math.max(0, stats.totalUsers - stats.certificateCount),
        ],
        backgroundColor: ['#10B981', '#E5E7EB'],
        borderColor: ['#059669', '#D1D5DB'],
        borderWidth: 3,
      },
    ],
  };

  const dailyLoginData = {
    labels: dailyLogins.map(day => day.displayDate),
    datasets: [
      {
        label: 'Users Logged In',
        data: dailyLogins.map(day => day.count),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12,
            weight: '600',
            family: 'system-ui',
          },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: 12,
        titleFont: {
          size: 13,
          weight: '600',
        },
        bodyFont: {
          size: 12,
        },
        cornerRadius: 8,
        displayColors: true,
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: 12,
        titleFont: {
          size: 13,
          weight: '600',
        },
        bodyFont: {
          size: 12,
        },
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: {
            size: 11,
            weight: '600',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        ticks: {
          font: {
            size: 11,
            weight: '600',
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          padding: 15,
          font: {
            size: 12,
            weight: '600',
            family: 'system-ui',
          },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: 12,
        titleFont: {
          size: 13,
          weight: '600',
        },
        bodyFont: {
          size: 12,
        },
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: {
            size: 11,
            weight: '600',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        ticks: {
          font: {
            size: 10,
            weight: '600',
          },
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          display: false,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-6 text-lg font-medium text-gray-700">Loading dashboard...</p>
          <p className="mt-2 text-sm text-gray-500">Fetching real-time data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header Section - Mobile Optimized */}
      <div className="mb-6 sm:mb-8 lg:mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-2 sm:mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Dashboard Overview
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Live Data
              </span>
              <span className="hidden sm:inline">•</span>
              <span>Real-time statistics and insights</span>
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border-2 border-red-200 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm sm:text-base font-semibold text-red-800 mb-1">Error loading data</h3>
              <p className="text-xs sm:text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards - Mobile Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 mb-8 sm:mb-10 lg:mb-12">
        {/* Total Users Card */}
        <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 overflow-hidden shadow-xl sm:shadow-2xl rounded-xl sm:rounded-2xl transform hover:scale-[1.02] transition-all duration-300 border border-blue-400/30">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 sm:p-3">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-blue-100 text-xs sm:text-sm font-semibold mb-2 uppercase tracking-wide">Total Users</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{stats.totalUsers}</p>
              <p className="text-blue-100 text-xs font-medium">Active users in system</p>
            </div>
          </div>
        </div>

        {/* Freshers Card */}
        <div className="group relative bg-gradient-to-br from-green-500 via-green-600 to-green-700 overflow-hidden shadow-xl sm:shadow-2xl rounded-xl sm:rounded-2xl transform hover:scale-[1.02] transition-all duration-300 border border-green-400/30">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 sm:p-3">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-green-100 text-xs sm:text-sm font-semibold mb-2 uppercase tracking-wide">Freshers</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{stats.freshers}</p>
              <p className="text-green-100 text-xs font-medium">
                {stats.totalUsers > 0 ? Math.round((stats.freshers / stats.totalUsers) * 100) : 0}% of total users
              </p>
            </div>
          </div>
        </div>

        {/* Avg Rating Card */}
        <div className="group relative bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 overflow-hidden shadow-xl sm:shadow-2xl rounded-xl sm:rounded-2xl transform hover:scale-[1.02] transition-all duration-300 border border-purple-400/30">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 sm:p-3">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-purple-100 text-xs sm:text-sm font-semibold mb-2 uppercase tracking-wide">Avg Rating</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{stats.averageRating || '0.00'}</p>
              <div className="flex items-center gap-0.5 sm:gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={`text-sm sm:text-lg ${star <= Math.round(parseFloat(stats.averageRating) || 0) ? 'text-yellow-300' : 'text-purple-300'}`}>
                    ★
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Role Switch Card */}
        <div className="group relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 overflow-hidden shadow-xl sm:shadow-2xl rounded-xl sm:rounded-2xl transform hover:scale-[1.02] transition-all duration-300 border border-orange-400/30">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 sm:p-3">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-orange-100 text-xs sm:text-sm font-semibold mb-2 uppercase tracking-wide">Role Switch</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{stats.roleSwitchCount}</p>
              <p className="text-orange-100 text-xs font-medium">
                {stats.totalUsers > 0 ? Math.round((stats.roleSwitchCount / stats.totalUsers) * 100) : 0}% interested in switching
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section - Mobile Optimized */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Analytics & Insights</h2>
        <p className="text-sm sm:text-base text-gray-600">Visual representation of user data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        {/* Users by Profession Chart */}
        <div className="bg-white shadow-lg sm:shadow-2xl rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 border border-gray-100 hover:shadow-xl sm:hover:shadow-3xl transition-shadow duration-300">
          <div className="mb-5 sm:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Users by Profession</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Distribution of user types</p>
              </div>
            </div>
          </div>
          <div className="h-64 sm:h-72 lg:h-80 mb-5 sm:mb-6">
            <Doughnut data={professionData} options={chartOptions} />
          </div>
          <div className="pt-5 sm:pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Freshers</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">{stats.freshers}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Professionals</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700">{stats.workingProfessionals}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Outcome Survey Chart */}
        <div className="bg-white shadow-lg sm:shadow-2xl rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 border border-gray-100 hover:shadow-xl sm:hover:shadow-3xl transition-shadow duration-300">
          <div className="mb-5 sm:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Outcome Survey</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Role switch interest analysis</p>
              </div>
            </div>
          </div>
          <div className="h-64 sm:h-72 lg:h-80 mb-5 sm:mb-6">
            <Doughnut data={roleSwitchData} options={chartOptions} />
          </div>
          <div className="pt-5 sm:pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Role Switch</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-700">{stats.roleSwitchCount}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Others</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-700">{Math.max(0, stats.totalUsers - stats.roleSwitchCount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Login Analytics Section */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Daily Login Analytics</h2>
        <p className="text-sm sm:text-base text-gray-600">Track user login activity over the last 30 days</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:gap-8 mb-6 sm:mb-8">
        {/* Daily Login Chart */}
        <div className="bg-white shadow-lg sm:shadow-2xl rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 border border-gray-100 hover:shadow-xl sm:hover:shadow-3xl transition-shadow duration-300">
          <div className="mb-5 sm:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Daily User Logins</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Number of users who logged in each day (Last 30 days)</p>
              </div>
            </div>
          </div>
          <div className="h-64 sm:h-72 lg:h-96 mb-5 sm:mb-6">
            <Line data={dailyLoginData} options={lineChartOptions} />
          </div>
          <div className="pt-5 sm:pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Total Logins</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700">
                  {dailyLogins.reduce((sum, day) => sum + day.count, 0)}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Avg Per Day</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">
                  {dailyLogins.length > 0 
                    ? Math.round((dailyLogins.reduce((sum, day) => sum + day.count, 0) / dailyLogins.length) * 10) / 10
                    : 0}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Peak Day</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-700">
                  {dailyLogins.length > 0 
                    ? Math.max(...dailyLogins.map(day => day.count))
                    : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Completion Section */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Course Completion Analytics</h2>
        <p className="text-sm sm:text-base text-gray-600">Users who have completed the full course and received certificates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        {/* Full Course Completion Chart */}
        <div className="bg-white shadow-lg sm:shadow-2xl rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 border border-gray-100 hover:shadow-xl sm:hover:shadow-3xl transition-shadow duration-300">
          <div className="mb-5 sm:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Full Course Completion</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Users who completed the full course</p>
              </div>
            </div>
          </div>
          <div className="h-64 sm:h-72 lg:h-80 mb-5 sm:mb-6">
            <Bar data={fullCourseData} options={barChartOptions} />
          </div>
          <div className="pt-5 sm:pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Completed</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-700">{stats.fullCourseCompleted}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Not Completed</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-700">{Math.max(0, stats.totalUsers - stats.fullCourseCompleted)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Issuance Chart */}
        <div className="bg-white shadow-lg sm:shadow-2xl rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 border border-gray-100 hover:shadow-xl sm:hover:shadow-3xl transition-shadow duration-300">
          <div className="mb-5 sm:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Certificate Issuance</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Users who received certificates</p>
              </div>
            </div>
          </div>
          <div className="h-64 sm:h-72 lg:h-80 mb-5 sm:mb-6">
            <Doughnut data={certificateData} options={chartOptions} />
          </div>
          <div className="pt-5 sm:pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">With Certificate</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">{stats.certificateCount}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">No Certificate</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-700">{Math.max(0, stats.totalUsers - stats.certificateCount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Course Completed Users List */}
      <div className="bg-white shadow-lg sm:shadow-2xl rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 border border-gray-100 hover:shadow-xl sm:hover:shadow-3xl transition-shadow duration-300">
        <div className="mb-5 sm:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Full Course Completed Users</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">List of users who have completed the full course ({fullCourseUsers.length} users)</p>
            </div>
          </div>
        </div>
        {fullCourseUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-gray-600 font-semibold text-lg mb-1">No users completed the full course yet</p>
            <p className="text-gray-400 text-sm">Users will appear here once they complete the full course</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 via-gray-50 to-gray-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Questions Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {fullCourseUsers.map((user, index) => (
                    <tr key={user.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 font-bold text-sm">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mr-3 shadow-md">
                            <span className="text-white font-bold text-xs">
                              {user.name && user.name.trim() ? user.name.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            {user.name || 'Unknown'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm text-gray-700 truncate max-w-[200px] sm:max-w-none" title={user.email || 'No email'}>
                          {user.email || 'No email'}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {user.questionsCompleted > 0 ? (
                            <>
                              <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm font-bold text-blue-600">{user.questionsCompleted}</span>
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-gray-400">0</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
