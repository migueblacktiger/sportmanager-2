import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { NEGOCIO_API_URL } from '../../negocio-api.config';
const base = NEGOCIO_API_URL;
@Injectable({ providedIn: 'root' })
export class CompetitionsApiService {
  private http = inject(HttpClient);
  tournaments() { return this.http.get<any[]>(`${base}/tournaments`).pipe(timeout(15000)); }
  teams() { return this.http.get<any[]>(`${base}/teams`).pipe(timeout(15000)); }
  registrations(tournamentId: number) { return this.http.get<any[]>(`${base}/tournaments/${tournamentId}/registrations`).pipe(timeout(15000)); }
  players() { return this.http.get<any[]>(`${base}/players`).pipe(timeout(15000)); }
  playerTeams(teamId: number) { return this.http.get<any[]>(`${base}/player-teams/teams/${teamId}`).pipe(timeout(15000)); }
  venues() { return this.http.get<any[]>(`${base}/venues`).pipe(timeout(15000)); }
  phases(tournamentId: number) { return this.http.get<any[]>(`${base}/tournaments/${tournamentId}/phases`).pipe(timeout(15000)); }
  createPhases(tournamentId: number, phases: any[]) { return this.http.post<any[]>(`${base}/tournaments/${tournamentId}/phases`, { phases }).pipe(timeout(15000)); }
  updatePhase(id: number, body: any) { return this.http.patch<any>(`${base}/phases/${id}`, body).pipe(timeout(15000)); }
  deletePhase(id: number) { return this.http.delete<any>(`${base}/phases/${id}`).pipe(timeout(15000)); }
  groups(tournamentId: number, phaseId: number) { return this.http.get<any[]>(`${base}/tournaments/${tournamentId}/phases/${phaseId}/groups`).pipe(timeout(15000)); }
  createGroups(tournamentId: number, phaseId: number, groups: any[]) { return this.http.post<any[]>(`${base}/tournaments/${tournamentId}/phases/${phaseId}/groups`, { groups }).pipe(timeout(15000)); }
  updateGroup(id: number, body: any) { return this.http.patch<any>(`${base}/groups/${id}`, body).pipe(timeout(15000)); }
  deleteGroup(id: number) { return this.http.delete<any>(`${base}/groups/${id}`).pipe(timeout(15000)); }
  groupTeams(groupId: number) { return this.http.get<any[]>(`${base}/groups/${groupId}/teams`).pipe(timeout(15000)); }
  assignTeams(groupId: number, teamIds: number[]) { return this.http.post<any[]>(`${base}/groups/${groupId}/teams`, { teamIds }).pipe(timeout(15000)); }
  removeGroupTeam(groupId: number, teamId: number) { return this.http.delete<any>(`${base}/groups/${groupId}/teams/${teamId}`).pipe(timeout(15000)); }
  finalPhases(tournamentId: number) { return this.http.get<any[]>(`${base}/tournaments/${tournamentId}/final-phases`).pipe(timeout(15000)); }
  createFinalPhase(tournamentId: number, body: any) { return this.http.post<any>(`${base}/tournaments/${tournamentId}/final-phases`, body).pipe(timeout(15000)); }
  updateFinalPhase(tournamentId: number, id: number, body: any) { return this.http.patch<any>(`${base}/tournaments/${tournamentId}/final-phases/${id}`, body).pipe(timeout(15000)); }
  deleteFinalPhase(tournamentId: number, id: number) { return this.http.delete<any>(`${base}/tournaments/${tournamentId}/final-phases/${id}`).pipe(timeout(15000)); }
  matches(tournamentId: number, phaseId?: number) { let params = new HttpParams(); if (phaseId) params = params.set('phaseId', phaseId); return this.http.get<any[]>(`${base}/tournaments/${tournamentId}/matches`, { params }).pipe(timeout(15000)); }
  createMatch(tournamentId: number, phaseId: number, body: any) { return this.http.post<any>(`${base}/tournaments/${tournamentId}/phases/${phaseId}/matches`, body).pipe(timeout(15000)); }
  updateMatch(tournamentId: number, id: number, body: any) { return this.http.patch<any>(`${base}/tournaments/${tournamentId}/matches/${id}`, body).pipe(timeout(15000)); }
  updateMatchStatus(tournamentId: number, id: number, status: string) { return this.http.patch<any>(`${base}/tournaments/${tournamentId}/matches/${id}/status`, { status }).pipe(timeout(15000)); }
  deleteMatch(tournamentId: number, id: number) { return this.http.delete<any>(`${base}/tournaments/${tournamentId}/matches/${id}`).pipe(timeout(15000)); }
  result(tournamentId: number, matchId: number) { return this.http.get<any>(`${base}/tournaments/${tournamentId}/matches/${matchId}/result`).pipe(timeout(15000)); }
  saveResult(tournamentId: number, matchId: number, body: any, exists: boolean) { const url = `${base}/tournaments/${tournamentId}/matches/${matchId}/result`; return (exists ? this.http.patch<any>(url, body) : this.http.post<any>(url, body)).pipe(timeout(15000)); }
  annotations(tournamentId: number, matchId: number) { return this.http.get<any[]>(`${base}/tournaments/${tournamentId}/matches/${matchId}/annotations`).pipe(timeout(15000)); }
  createAnnotation(tournamentId: number, matchId: number, body: any) { return this.http.post<any>(`${base}/tournaments/${tournamentId}/matches/${matchId}/annotations`, body).pipe(timeout(15000)); }
  updateAnnotation(tournamentId: number, matchId: number, id: number, body: any) { return this.http.patch<any>(`${base}/tournaments/${tournamentId}/matches/${matchId}/annotations/${id}`, body).pipe(timeout(15000)); }
  deleteAnnotation(tournamentId: number, matchId: number, id: number) { return this.http.delete<any>(`${base}/tournaments/${tournamentId}/matches/${matchId}/annotations/${id}`).pipe(timeout(15000)); }
  overview(tournamentId: number) { return this.http.get<any>(`${base}/tournaments/${tournamentId}/overview`, { params: { includeAnnotations: 'true' } }).pipe(timeout(15000)); }
}
