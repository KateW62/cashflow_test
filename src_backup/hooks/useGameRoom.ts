import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Player {
  id: string;
  name: string;
  isOnline: boolean;
}

interface GameRoomHook {
  roomId: string | null;
  players: Player[];
  currentTurnPlayerId: string | null;
  isMyTurn: boolean;
  createRoom: (roomId: string, playerName: string) => Promise<void>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  leaveRoom: () => void;
  clearRoom: () => void;
  broadcastGameState: (gameState: any) => void;
  onGameStateUpdate: (callback: (gameState: any, playerId: string, triggerPlayerId: string) => void) => void;
  endTurn: () => void;
}

export const useGameRoom = (localPlayerId: string): GameRoomHook => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameStateCallbackRef = useRef<((gameState: any, playerId: string, triggerPlayerId: string) => void) | null>(null);

  const isMyTurn = currentTurnPlayerId === localPlayerId;

  const createRoom = async (newRoomId: string, playerName: string) => {
    if (!supabase) {
      console.warn('Supabase not available, skipping multiplayer setup');
      return;
    }

    if (channelRef.current) {
      await channelRef.current.unsubscribe();
    }

    const channel = supabase.channel(`room:${newRoomId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: localPlayerId },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlinePlayers: Player[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && presences.length > 0) {
            const presence = presences[0] as any;
            onlinePlayers.push({
              id: presence.id,
              name: presence.name,
              isOnline: true,
            });
          }
        });

        setPlayers(onlinePlayers);

        if (onlinePlayers.length > 0 && !currentTurnPlayerId) {
          setCurrentTurnPlayerId(onlinePlayers[0].id);
        }
      })
      .on('broadcast', { event: 'game-state' }, ({ payload }) => {
        if (gameStateCallbackRef.current) {
          gameStateCallbackRef.current(payload.gameState, payload.playerId, payload.triggerPlayerId);
        }
      })
      .on('broadcast', { event: 'turn-end' }, ({ payload }) => {
        setCurrentTurnPlayerId(payload.nextPlayerId);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: localPlayerId,
            name: playerName,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;
    setRoomId(newRoomId);
  };

  const joinRoom = async (existingRoomId: string, playerName: string) => {
    await createRoom(existingRoomId, playerName);
  };

  const leaveRoom = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setRoomId(null);
    setPlayers([]);
    setCurrentTurnPlayerId(null);
  };

  const clearRoom = () => {
    leaveRoom();
    gameStateCallbackRef.current = null;
  };

  const broadcastGameState = (gameState: any) => {
    if (channelRef.current && roomId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game-state',
        payload: {
          gameState,
          playerId: localPlayerId,
          triggerPlayerId: localPlayerId,
          timestamp: Date.now(),
        },
      });
    }
  };

  const onGameStateUpdate = (callback: (gameState: any, playerId: string, triggerPlayerId: string) => void) => {
    gameStateCallbackRef.current = callback;
  };

  const endTurn = () => {
    if (channelRef.current && players.length > 0) {
      const currentIndex = players.findIndex((p) => p.id === currentTurnPlayerId);
      const nextIndex = (currentIndex + 1) % players.length;
      const nextPlayerId = players[nextIndex].id;

      channelRef.current.send({
        type: 'broadcast',
        event: 'turn-end',
        payload: {
          nextPlayerId,
          timestamp: Date.now(),
        },
      });

      setCurrentTurnPlayerId(nextPlayerId);
    }
  };

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    roomId,
    players,
    currentTurnPlayerId,
    isMyTurn,
    createRoom,
    joinRoom,
    leaveRoom,
    clearRoom,
    broadcastGameState,
    onGameStateUpdate,
    endTurn,
  };
};
