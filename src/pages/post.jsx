import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = 'https://backend-react-fcsl.onrender.com/api-backend';

const REACTION_TYPES = [
  { type: 'like', emoji: '👍' },
  { type: 'love', emoji: '❤️' },
  { type: 'haha', emoji: '😂' },
  { type: 'wow', emoji: '😮' },
  { type: 'sad', emoji: '😢' },
  { type: 'angry', emoji: '😡' },
];

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warningMsg, setWarningMsg] = useState('');

  // Cargar publicaciones al entrar (Endpoint público, sin token)
  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API_URL}/posts`);
      if (response.ok) {
        const data = await response.json();
        // Ajusta si tu backend devuelve { posts: [...] } o directamente el array [...]
        setPosts(Array.isArray(data) ? data : data.posts || []);
      }
    } catch (error) {
      console.error('Error al cargar publicaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Manejar clic en una reacción
  const handleReaction = async (postId, reactionType) => {
    setWarningMsg('');
    
    // Obtener el ID del usuario si está logueado (revisa cómo lo guardaste en tu login)
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = storedUser?.id || storedUser?._id || null;

    const payload = { type: reactionType };
    if (userId) {
      payload.userId = userId;
    }

    try {
      const response = await fetch(`${API_URL}/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Regla: 409 Conflict si el usuario repite la misma reacción
      if (response.status === 409) {
        setWarningMsg('Ya has reaccionado con este emoji a esta publicación.');
        setTimeout(() => setWarningMsg(''), 4000);
        return;
      }

      // Éxito: 201 Created -> actualizar contadores en tiempo real
      if (response.status === 201 || response.ok) {
        const result = await response.json();
        // La API devuelve los contadores actualizados (counts)
        const updatedCounts = result.counts || result.reactions;

        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            const currentId = post.id || post._id;
            if (currentId === postId) {
              return {
                ...post,
                counts: updatedCounts || post.counts,
                reactions: updatedCounts || post.reactions,
              };
            }
            return post;
          })
        );
      }
    } catch (error) {
      console.error('Error al reaccionar:', error);
    }
  };

  if (loading) return <div className="text-center p-8">Cargando publicaciones...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Muro de Publicaciones</h1>
        <Link
          to="/crear-post"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + Nueva Publicación
        </Link>
      </div>

      {/* Mensaje de advertencia para error 409 */}
      {warningMsg && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 mb-4 rounded">
          ⚠️ {warningMsg}
        </div>
      )}

      <div className="space-y-6">
        {posts.map((post) => {
          const postId = post.id || post._id;
          // Soporta tanto post.counts como post.reactions según venga del JSON
          const counts = post.counts || post.reactions || {};

          return (
            <div key={postId} className="bg-white shadow-md rounded-xl p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-semibold text-gray-900">{post.title}</h2>
                <span className="text-xs text-gray-400">
                  {new Date(post.createdAt).toLocaleDateString('es-CL', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <p className="text-sm text-blue-600 font-medium mb-3">
                Por: {post.author?.name || 'Usuario'}
              </p>

              <p className="text-gray-700 whitespace-pre-line mb-5">{post.content}</p>

              {/* Barra de 6 reacciones */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                {REACTION_TYPES.map(({ type, emoji }) => (
                  <button
                    key={type}
                    onClick={() => handleReaction(postId, type)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition text-sm cursor-pointer"
                    title={type}
                  >
                    <span>{emoji}</span>
                    <span className="font-semibold text-gray-700">
                      {counts[type] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}