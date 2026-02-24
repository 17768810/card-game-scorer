const API_BASE = '/api';

// 通用API请求方法
export const API = {
  async get(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`);
    return await response.json();
  },

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  async put(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  async delete(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE'
    });
    return await response.json();
  }
};

// 保留旧的API函数以兼容现有代码
export async function createRoom(gameType = 'shisanshui', creatorName = '玩家1', settings = {}) {
  const response = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ gameType, creatorName, settings })
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function getRoomByCode(code) {
  const response = await fetch(`${API_BASE}/rooms/${code}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function getRoomPlayers(code) {
  const response = await fetch(`${API_BASE}/rooms/${code}/players`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function joinRoom(code, playerName, userGlobalId = null) {
  const response = await fetch(`${API_BASE}/rooms/${code}/players`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ playerName, userGlobalId })
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function getRoomStats(code) {
  const response = await fetch(`${API_BASE}/rooms/${code}/stats`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function getRoundHistory(code) {
  const response = await fetch(`${API_BASE}/rooms/${code}/rounds`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function getNextRoundNumber(code) {
  const response = await fetch(`${API_BASE}/rooms/${code}/rounds`, {
    method: 'POST'
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data.roundNumber;
}
