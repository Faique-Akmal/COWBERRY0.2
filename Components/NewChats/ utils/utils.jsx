// utils/utils.js
export const makeId = (prefix = '') =>
  prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);

export const formatTime = (ts) => {
  const d = new Date(ts);
  const hh = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

export const sampleConversations = () => ([
  {
    id: 'conv_1',
    name: 'Amit Sharma',
    avatar: null,
    lastMessage: 'Thik hai, kal milte hain',
    lastTime: Date.now() - 1000 * 60 * 60,
    unread: 2,
    messages: [
      { id: 'm1', fromMe: false, text: 'Hi!', time: Date.now() - 1000 * 60 * 60 * 4, status: 'read' },
      { id: 'm2', fromMe: true, text: 'Kaise ho?', time: Date.now() - 1000 * 60 * 60 * 3, status: 'read' },
      { id: 'm3', fromMe: false, text: 'Thik, kal milte hain', time: Date.now() - 1000 * 60 * 60, status: 'delivered' },
    ]
  },
  {
    id: 'conv_2',
    name: 'Priya',
    avatar: null,
    lastMessage: 'Photos bhej raha hu',
    lastTime: Date.now() - 1000 * 60 * 30,
    unread: 0,
    messages: [
      { id: 'p1', fromMe: false, text: 'Photos bhej do', time: Date.now() - 1000 * 60 * 40, status: 'delivered' },
    ]
  },
]);
