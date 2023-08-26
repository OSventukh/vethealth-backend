import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { Post } from 'src/posts/entities/post.entity';
import { hashPassword } from 'src/utils/password-hash';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstname: string;

  @Column({ nullable: true })
  lastname?: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Exclude({ toPlainOnly: true })
  previousPassword: string;

  @AfterLoad()
  loadPreviousPassword(): void {
    this.previousPassword = this.password;
  }

  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  confirmationToken?: string;

  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  confirmationTokenExpirationDate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @BeforeInsert()
  @BeforeUpdate()
  async setPassword() {
    if (this.previousPassword !== this.password && this.password) {
      this.password = await hashPassword(this.password);
    }
  }
}
