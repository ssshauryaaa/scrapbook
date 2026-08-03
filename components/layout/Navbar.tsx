'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import {
  BookOpen, Bell, Search, LogOut, Settings, User,
  Users, LayoutDashboard, ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { Avatar } from '@/components/ui/Avatar'
import { NotificationFeed } from '@/components/notifications/NotificationFeed'
import styles from './Navbar.module.css'

export function Navbar() {
  const router                    = useRouter()
  const { user, profile, signOut } = useAuth()
  const { unreadCount }           = useNotifications()
  const [search,     setSearch]    = useState('')
  const [showNotif,  setShowNotif]  = useState(false)
  const [showMenu,   setShowMenu]   = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const menuRef  = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
      if (menuRef.current  && !menuRef.current.contains(e.target  as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/search?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className={styles.logo}>
          <BookOpen size={22} className={styles.logoIcon} />
          <span className={styles.logoText}>Scrapbook</span>
        </Link>

        {/* Search */}
        <form className={styles.searchForm} onSubmit={handleSearch} role="search">
          <Search size={16} className={styles.searchIcon} aria-hidden />
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Find friends, communities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search"
          />
        </form>

        {/* Right side */}
        <div className={styles.right}>
          {user ? (
            <>
              {/* Nav links */}
              <Link href="/dashboard" className={styles.navLink}>
                <LayoutDashboard size={18} />
                <span>Home</span>
              </Link>
              <Link href="/friends" className={styles.navLink}>
                <Users size={18} />
                <span>Friends</span>
              </Link>
              <Link href="/communities" className={styles.navLink}>
                <BookOpen size={18} />
                <span>Communities</span>
              </Link>

              {/* Notifications */}
              <div className={styles.notifWrap} ref={notifRef}>
                <button
                  id="notifications-btn"
                  className={styles.iconBtn}
                  onClick={() => { setShowNotif((v) => !v); setShowMenu(false) }}
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className={styles.badge}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotif && (
                  <div className={styles.notifDropdown}>
                    <NotificationFeed onClose={() => setShowNotif(false)} />
                  </div>
                )}
              </div>

              {/* Avatar menu */}
              <div className={styles.menuWrap} ref={menuRef}>
                <button
                  id="user-menu-btn"
                  className={styles.avatarBtn}
                  onClick={() => { setShowMenu((v) => !v); setShowNotif(false) }}
                  aria-label="User menu"
                >
                  <Avatar
                    src={profile?.avatar_url}
                    displayName={profile?.display_name}
                    username={profile?.username}
                    size="sm"
                  />
                  <ChevronDown size={14} className={styles.chevron} />
                </button>
                {showMenu && (
                  <div className={styles.menuDropdown}>
                    <div className={styles.menuHeader}>
                      <p className={styles.menuName}>{profile?.display_name ?? profile?.username}</p>
                      <p className={styles.menuHandle}>@{profile?.username}</p>
                    </div>
                    <div className={styles.menuDivider} />
                    <Link
                      href={`/${profile?.username}`}
                      className={styles.menuItem}
                      onClick={() => setShowMenu(false)}
                    >
                      <User size={16} /> My Profile
                    </Link>
                    <Link
                      href={`/${profile?.username}/edit`}
                      className={styles.menuItem}
                      onClick={() => setShowMenu(false)}
                    >
                      <Settings size={16} /> Settings
                    </Link>
                    <div className={styles.menuDivider} />
                    <button
                      className={[styles.menuItem, styles.menuItemDanger].join(' ')}
                      onClick={signOut}
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login"  className={styles.authLink}>Sign In</Link>
              <Link href="/signup" className={styles.authBtn}>Get Started</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
