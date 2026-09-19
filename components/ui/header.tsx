"use client"

import { useSession } from 'next-auth/react';
import Link from 'next/link';

const Header = () => {

    const {data : session} = useSession()
    console.log(session)

    return (
        <header className="border-b">
            <div className="container flex h-14 items-center gap-6">
                <Link href="/" className="font-bold text-green-700">
                    WhatsApp Outreach AI
                </Link>
                <nav className="flex gap-4 text-sm text-muted-foreground">
                    <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
                    <Link href="/contacts" className="hover:text-foreground">Contacts</Link>
                    <Link href="/campaigns" className="hover:text-foreground">Campaigns</Link>
                    <Link href="/messages" className="hover:text-foreground">Messages</Link>
                    <Link href="/whatsapp" className="hover:text-foreground">WhatsApp</Link>
                    <Link href="/settings" className="hover:text-foreground">Settings</Link>
                </nav>
                <div className="ml-auto flex gap-3 text-sm">
                    <Link href="/login" className="hover:text-foreground">Login</Link>
                    <Link href="/register" className="hover:text-foreground">Register</Link>
                </div>
            </div>
        </header>
    );
};

export default Header;