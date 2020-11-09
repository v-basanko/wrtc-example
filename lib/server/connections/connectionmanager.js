'use strict';

const uuidv4 = require('uuid/v4');

const generateId = ()=>{
    return `${uuidv4()}-${Date.now()}`;
};

const Connection = require('./webrtcconnection');

class ConnectionManager {
    constructor() {
        this.connections = new Map();
        this.closedListeners = new Map();
    }

    createConnection() {
        const id = generateId();
        const connection = new Connection(id);
        const closedListener = ()=>{ this.deleteConnection(id); };
        this.closedListeners.set(connection, closedListener);
        connection.once('closed', closedListener);
        this.connections.set(connection.id, connection);
        return connection;
    }

    deleteConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        const closedListener = this.closedListeners.get(connection);
        this.closedListeners.delete(connection);
        connection.removeListener('closed', closedListener);
        this.connections.delete(connection.id);
    }

    getConnection(id) {
        return this.connections.get(id) || null;
    }

    getConnections() {
        return [...this.connections.values()];
    }

    toJSON() {
        return this.getConnections().map(connection => connection.toJSON());
    }
}

module.exports = ConnectionManager;
